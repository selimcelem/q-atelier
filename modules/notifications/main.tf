variable "project_name" { type = string }
variable "sibel_email" {
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

output "ses_topic_arn" { value = aws_ses_email_identity.sender.arn }
