variable "project_name" { type = string }
variable "sibel_email" {
  type      = string
  sensitive = true
}
variable "sibel_phone" {
  type      = string
  sensitive = true
}
variable "ses_from_email" {
  type      = string
  sensitive = true
}

# ── SES email identity ────────────────────────────────────────────
# Verifies the sender address. Owner will get a verification email.
resource "aws_ses_email_identity" "sender" {
  email = var.ses_from_email
}

# SES receiving identity for owner's gmail (so they can receive from SES)
resource "aws_ses_email_identity" "sibel" {
  email = var.sibel_email
}

# ── SNS topic for SMS notifications ──────────────────────────────
resource "aws_sns_topic" "booking_alerts" {
  name = "${var.project_name}-booking-alerts"
}

resource "aws_sns_topic_subscription" "sibel_sms" {
  topic_arn = aws_sns_topic.booking_alerts.arn
  protocol  = "sms"
  endpoint  = var.sibel_phone
}

output "ses_topic_arn" { value = aws_ses_email_identity.sender.arn }
output "sns_topic_arn" { value = aws_sns_topic.booking_alerts.arn }
