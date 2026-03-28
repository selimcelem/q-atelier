output "cloudfront_domain" {
  description = "Point your domain's CNAME here"
  value       = module.hosting.cloudfront_domain
}

output "cloudfront_distribution_id" {
  description = "Used for cache invalidation on deploy"
  value       = module.hosting.cloudfront_distribution_id
}

output "site_bucket_name" {
  description = "S3 bucket to sync frontend/public/ into"
  value       = module.hosting.site_bucket_name
}

output "api_endpoint" {
  description = "Base URL for the booking API"
  value       = module.api.api_endpoint
}
