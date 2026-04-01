variable "project_name" { type = string }
variable "owner_email" {
  type      = string
  sensitive = true
}

# ── SES email identity ────────────────────────────────────────────
# Verifies the owner's email so they can receive from SES.
resource "aws_ses_email_identity" "owner" {
  email = var.owner_email
}

output "ses_topic_arn" { value = aws_ses_email_identity.owner.arn }
