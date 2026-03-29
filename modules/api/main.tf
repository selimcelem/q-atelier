variable "project_name" { type = string }
variable "bookings_table_arn" { type = string }
variable "bookings_table_name" { type = string }
variable "ses_topic_arn" { type = string }
variable "sns_topic_arn" { type = string }
variable "sibel_email" {
  type      = string
  sensitive = true
}
variable "ses_from_email" {
  type      = string
  sensitive = true
}

# ── IAM role for Lambda ───────────────────────────────────────────
resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "${var.project_name}-lambda-policy"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # CloudWatch Logs
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        # DynamoDB - bookings table only
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:UpdateItem"]
        Resource = [var.bookings_table_arn, "${var.bookings_table_arn}/index/*"]
      },
      {
        # SES - send emails
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      },
      {
        # SNS - publish booking alerts
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = var.sns_topic_arn
      }
    ]
  })
}

# ── Lambda: booking handler ───────────────────────────────────────
data "archive_file" "booking" {
  type        = "zip"
  source_dir  = "${path.root}/lambda/booking"
  output_path = "${path.root}/.terraform/lambda-booking.zip"
}

resource "aws_lambda_function" "booking" {
  function_name    = "${var.project_name}-booking"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.booking.output_path
  source_code_hash = data.archive_file.booking.output_base64sha256
  timeout          = 15

  environment {
    variables = {
      BOOKINGS_TABLE = var.bookings_table_name
      SNS_TOPIC_ARN  = var.sns_topic_arn
      SIBEL_EMAIL    = var.sibel_email
      FROM_EMAIL     = var.ses_from_email
    }
  }
}

# ── API Gateway ───────────────────────────────────────────────────
resource "aws_api_gateway_rest_api" "api" {
  name = "${var.project_name}-api"
}

# /slots resource
resource "aws_api_gateway_resource" "slots" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "slots"
}

resource "aws_api_gateway_method" "slots_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.slots.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "slots_get" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.slots.id
  http_method             = aws_api_gateway_method.slots_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.booking.invoke_arn
}

# /booking resource
resource "aws_api_gateway_resource" "booking" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "booking"
}

resource "aws_api_gateway_method" "booking_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.booking.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "booking_post" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.booking.id
  http_method             = aws_api_gateway_method.booking_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.booking.invoke_arn
}

# CORS OPTIONS for /booking
resource "aws_api_gateway_method" "booking_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.booking.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "booking_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.booking.id
  http_method = aws_api_gateway_method.booking_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "booking_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.booking.id
  http_method = aws_api_gateway_method.booking_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "booking_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.booking.id
  http_method = aws_api_gateway_method.booking_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_integration.booking_options]
}

# /action resource
resource "aws_api_gateway_resource" "action" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "action"
}

resource "aws_api_gateway_method" "action_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.action.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "action_get" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.action.id
  http_method             = aws_api_gateway_method.action_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.booking.invoke_arn
}

# /reschedule resource
resource "aws_api_gateway_resource" "reschedule" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "reschedule"
}

resource "aws_api_gateway_method" "reschedule_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.reschedule.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "reschedule_get" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.reschedule.id
  http_method             = aws_api_gateway_method.reschedule_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.booking.invoke_arn
}

resource "aws_api_gateway_method" "reschedule_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.reschedule.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "reschedule_post" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.reschedule.id
  http_method             = aws_api_gateway_method.reschedule_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.booking.invoke_arn
}

# CORS OPTIONS for /reschedule
resource "aws_api_gateway_method" "reschedule_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.reschedule.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "reschedule_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.reschedule.id
  http_method = aws_api_gateway_method.reschedule_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "reschedule_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.reschedule.id
  http_method = aws_api_gateway_method.reschedule_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "reschedule_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.reschedule.id
  http_method = aws_api_gateway_method.reschedule_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_integration.reschedule_options]
}

# /respond resource
resource "aws_api_gateway_resource" "respond" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "respond"
}

resource "aws_api_gateway_method" "respond_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.respond.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "respond_get" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.respond.id
  http_method             = aws_api_gateway_method.respond_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.booking.invoke_arn
}

# Deployment
resource "aws_api_gateway_deployment" "api" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  depends_on = [
    aws_api_gateway_integration.slots_get,
    aws_api_gateway_integration.booking_post,
    aws_api_gateway_integration.booking_options,
    aws_api_gateway_integration.action_get,
    aws_api_gateway_integration.reschedule_get,
    aws_api_gateway_integration.reschedule_post,
    aws_api_gateway_integration.reschedule_options,
    aws_api_gateway_integration.respond_get,
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "prod"
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.booking.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

output "api_endpoint" {
  value = aws_api_gateway_stage.prod.invoke_url
}
