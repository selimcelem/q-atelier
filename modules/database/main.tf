variable "project_name" { type = string }

# ── Bookings table ────────────────────────────────────────────────
# PK: date (YYYY-MM-DD)  SK: time_slot (HH:MM)
# This lets us query all slots for a given day efficiently
resource "aws_dynamodb_table" "bookings" {
  name         = "${var.project_name}-bookings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "date"
  range_key    = "time_slot"

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "time_slot"
    type = "S"
  }

  # GSI: query all bookings by month (for admin view)
  global_secondary_index {
    name            = "month-index"
    hash_key        = "month"
    projection_type = "ALL"
  }

  attribute {
    name = "month"
    type = "S"
  }

  # GSI: look up bookings by token (for action links)
  global_secondary_index {
    name            = "token-index"
    hash_key        = "token"
    projection_type = "ALL"
  }

  attribute {
    name = "token"
    type = "S"
  }

  # TTL: auto-expire old bookings after 1 year
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  point_in_time_recovery { enabled = true }

  tags = {
    Project = var.project_name
  }
}

output "bookings_table_arn" { value = aws_dynamodb_table.bookings.arn }
output "bookings_table_name" { value = aws_dynamodb_table.bookings.name }
