
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "swaggerDoc": {
    "openapi": "3.0.3",
    "info": {
      "title": "Travel App API",
      "version": "1.0.0",
      "description": "Backend API for the Travel Application - auth, offers (with image upload to Supabase Storage), and bookings. Admin offer/review/tag writes require SUPABASE_SERVICE_ROLE_KEY."
    },
    "servers": [
      {
        "url": "http://localhost:3000",
        "description": "Development server"
      },
      {
        "url": "http://localhost:3000/api/v1",
        "description": "Versioned API base"
      }
    ],
    "components": {
      "securitySchemes": {
        "bearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT",
          "description": "JWT token from /auth/login"
        },
        "hmacSignature": {
          "type": "apiKey",
          "in": "header",
          "name": "x-signature",
          "description": "Optional HMAC signature header (required when REQUIRE_HMAC=true)"
        },
        "hmacTimestamp": {
          "type": "apiKey",
          "in": "header",
          "name": "x-timestamp",
          "description": "UNIX timestamp used with x-signature"
        },
        "idempotencyKey": {
          "type": "apiKey",
          "in": "header",
          "name": "Idempotency-Key",
          "description": "Optional idempotency key for critical write endpoints"
        }
      },
      "schemas": {
        "ApiSuccess": {
          "type": "object",
          "properties": {
            "success": {
              "type": "boolean",
              "example": true
            },
            "message": {
              "type": "string"
            },
            "data": {
              "type": "object",
              "nullable": true
            },
            "pagination": {
              "type": "object",
              "nullable": true,
              "properties": {
                "page": {
                  "type": "integer"
                },
                "limit": {
                  "type": "integer"
                },
                "total": {
                  "type": "integer"
                }
              }
            }
          }
        },
        "Error": {
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "description": "Error message"
            },
            "success": {
              "type": "boolean",
              "example": false
            },
            "data": {
              "type": "object",
              "nullable": true
            }
          }
        },
        "ValidationErrors": {
          "type": "object",
          "description": "Joi validation error format",
          "properties": {
            "success": {
              "type": "boolean",
              "example": false
            },
            "message": {
              "type": "string",
              "example": "Validation error"
            },
            "data": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "message": {
                    "type": "string"
                  },
                  "path": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "SignupRequest": {
          "type": "object",
          "required": [
            "email",
            "password",
            "firstName",
            "lastName",
            "phone"
          ],
          "properties": {
            "email": {
              "type": "string",
              "format": "email"
            },
            "password": {
              "type": "string",
              "minLength": 6
            },
            "firstName": {
              "type": "string"
            },
            "lastName": {
              "type": "string"
            },
            "phone": {
              "type": "string"
            },
            "gender": {
              "type": "string"
            },
            "role": {
              "type": "string",
              "enum": [
                "user"
              ],
              "description": "Self-signup is always a traveler; use super admin to create agency admins."
            }
          }
        },
        "LoginRequest": {
          "type": "object",
          "required": [
            "password"
          ],
          "properties": {
            "email": {
              "type": "string",
              "format": "email"
            },
            "phone": {
              "type": "string"
            },
            "password": {
              "type": "string"
            }
          },
          "description": "Either email or phone is required"
        },
        "AuthResponse": {
          "type": "object",
          "properties": {
            "success": {
              "type": "boolean"
            },
            "message": {
              "type": "string"
            },
            "token": {
              "type": "string"
            },
            "user": {
              "type": "object"
            }
          }
        },
        "ForgotPasswordRequest": {
          "type": "object",
          "required": [
            "email"
          ],
          "properties": {
            "email": {
              "type": "string",
              "format": "email"
            }
          }
        },
        "ForgotPasswordResponse": {
          "type": "object",
          "properties": {
            "success": {
              "type": "boolean",
              "example": true
            },
            "message": {
              "type": "string",
              "example": "If an account with that email exists, a reset code has been sent"
            },
            "code": {
              "type": "string",
              "pattern": "^\\d{6}$",
              "description": "Only in development when SMTP is not configured — never returned in production"
            },
            "detail": {
              "type": "string",
              "description": "Only on 503 in development — SMTP error detail"
            }
          }
        },
        "ResetPasswordRequest": {
          "type": "object",
          "required": [
            "email",
            "code",
            "password"
          ],
          "properties": {
            "email": {
              "type": "string",
              "format": "email"
            },
            "code": {
              "type": "string",
              "pattern": "^\\d{6}$",
              "description": "6-digit code from the forgot-password email"
            },
            "password": {
              "type": "string",
              "minLength": 6,
              "description": "New password"
            }
          }
        },
        "User": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "full_name": {
              "type": "string"
            },
            "email": {
              "type": "string"
            },
            "phone": {
              "type": "string"
            },
            "role": {
              "type": "string",
              "enum": [
                "user",
                "admin",
                "superAdmin"
              ]
            },
            "status": {
              "type": "string",
              "enum": [
                "active",
                "deactivated"
              ],
              "default": "active"
            }
          }
        },
        "Offer": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "title": {
              "type": "string"
            },
            "location": {
              "type": "string"
            },
            "type": {
              "type": "string",
              "enum": [
                "standard",
                "custom",
                "special",
                "activity"
              ]
            },
            "description": {
              "type": "string"
            },
            "duration": {
              "type": "string"
            },
            "places": {
              "type": "integer"
            },
            "available": {
              "type": "boolean"
            },
            "image_url": {
              "type": "string"
            },
            "total_price": {
              "type": "number"
            },
            "currency": {
              "type": "string"
            },
            "amenities": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "itinerary": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "rating": {
              "type": "number"
            },
            "total_reviews": {
              "type": "integer"
            }
          }
        },
        "OfferCreate": {
          "type": "object",
          "required": [
            "title",
            "location",
            "type"
          ],
          "description": "For JSON body. For multipart/form-data use POST /offers with field \"image\" (file); image is uploaded to Supabase bucket and URL stored in offer.",
          "properties": {
            "title": {
              "type": "string"
            },
            "location": {
              "type": "string"
            },
            "type": {
              "type": "string",
              "enum": [
                "standard",
                "custom",
                "special",
                "activity"
              ]
            },
            "description": {
              "type": "string"
            },
            "duration": {
              "type": "string"
            },
            "places": {
              "type": "integer"
            },
            "available": {
              "type": "boolean"
            },
            "image_url": {
              "type": "string",
              "description": "Optional; omit when sending image file via form-data"
            },
            "total_price": {
              "type": "number"
            },
            "currency": {
              "type": "string"
            },
            "amenities": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "itinerary": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        },
        "ReviewBody": {
          "type": "object",
          "required": [
            "rating",
            "author"
          ],
          "properties": {
            "rating": {
              "type": "integer",
              "minimum": 1,
              "maximum": 5
            },
            "comment": {
              "type": "string"
            },
            "author": {
              "type": "string"
            }
          }
        },
        "TagBody": {
          "type": "object",
          "required": [
            "tag"
          ],
          "properties": {
            "tag": {
              "type": "string"
            }
          }
        },
        "BookingCreate": {
          "type": "object",
          "required": [
            "offer_id",
            "total_price",
            "payment_method"
          ],
          "properties": {
            "offer_id": {
              "type": "string",
              "format": "uuid"
            },
            "total_price": {
              "type": "number",
              "minimum": 0
            },
            "payment_method": {
              "type": "string",
              "enum": [
                "CIB",
                "Dahabiya",
                "Pay at agency"
              ]
            }
          }
        },
        "BookingStatusUpdate": {
          "type": "object",
          "required": [
            "status"
          ],
          "properties": {
            "status": {
              "type": "string",
              "enum": [
                "pending",
                "confirmed",
                "validated",
                "ready_for_agency",
                "completed",
                "cancelled"
              ]
            },
            "payment_status": {
              "type": "string",
              "enum": [
                "pending",
                "under_review",
                "paid",
                "failed",
                "refunded"
              ]
            },
            "deposit_amount": {
              "type": "number",
              "minimum": 0,
              "description": "Expected fixed deposit is 1000 DZD"
            }
          }
        },
        "Booking": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "user_id": {
              "type": "string",
              "format": "uuid"
            },
            "offer_id": {
              "type": "string",
              "format": "uuid"
            },
            "total_price": {
              "type": "number"
            },
            "payment_method": {
              "type": "string"
            },
            "status": {
              "type": "string",
              "enum": [
                "pending",
                "confirmed",
                "validated",
                "ready_for_agency",
                "completed",
                "cancelled"
              ]
            },
            "payment_status": {
              "type": "string",
              "enum": [
                "pending",
                "under_review",
                "paid",
                "failed",
                "refunded"
              ],
              "default": "pending"
            },
            "deposit_receipt_url": {
              "type": "string",
              "format": "uri",
              "nullable": true
            },
            "deposit_receipt_uploaded_at": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            }
          }
        },
        "CustomTripCreate": {
          "type": "object",
          "required": [
            "destination",
            "travelers_count"
          ],
          "properties": {
            "destination": {
              "type": "string"
            },
            "travelers_count": {
              "type": "integer",
              "minimum": 1
            },
            "start_date": {
              "type": "string",
              "format": "date"
            },
            "end_date": {
              "type": "string",
              "format": "date"
            },
            "budget_dzd": {
              "type": "number",
              "minimum": 0
            },
            "notes": {
              "type": "string"
            }
          }
        },
        "CustomTripStatusUpdate": {
          "type": "object",
          "required": [
            "status"
          ],
          "properties": {
            "status": {
              "type": "string",
              "enum": [
                "pending",
                "under_review",
                "approved",
                "rejected",
                "cancelled"
              ]
            },
            "admin_notes": {
              "type": "string"
            }
          }
        },
        "CustomTrip": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "user_id": {
              "type": "string",
              "format": "uuid"
            },
            "destination": {
              "type": "string"
            },
            "travelers_count": {
              "type": "integer"
            },
            "start_date": {
              "type": "string",
              "format": "date",
              "nullable": true
            },
            "end_date": {
              "type": "string",
              "format": "date",
              "nullable": true
            },
            "budget_dzd": {
              "type": "number",
              "nullable": true
            },
            "notes": {
              "type": "string",
              "nullable": true
            },
            "status": {
              "type": "string",
              "enum": [
                "pending",
                "under_review",
                "approved",
                "rejected",
                "cancelled"
              ]
            },
            "admin_notes": {
              "type": "string",
              "nullable": true
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time"
            }
          }
        },
        "FcmTokenRequest": {
          "type": "object",
          "required": [
            "fcm_token"
          ],
          "properties": {
            "fcm_token": {
              "type": "string",
              "minLength": 10,
              "maxLength": 4096
            },
            "platform": {
              "type": "string",
              "enum": [
                "ios",
                "android",
                "web",
                "unknown"
              ],
              "default": "unknown"
            }
          }
        },
        "NotificationSendRequest": {
          "type": "object",
          "required": [
            "title",
            "body"
          ],
          "properties": {
            "title": {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            "body": {
              "type": "string",
              "minLength": 1,
              "maxLength": 2000
            },
            "data": {
              "type": "object",
              "additionalProperties": true
            }
          }
        },
        "NotificationHistoryItem": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "user_id": {
              "type": "string",
              "format": "uuid"
            },
            "title": {
              "type": "string"
            },
            "body": {
              "type": "string"
            },
            "data": {
              "type": "object",
              "additionalProperties": true
            },
            "notification_type": {
              "type": "string"
            },
            "fcm_message_id": {
              "type": "string",
              "nullable": true
            },
            "delivery_status": {
              "type": "string",
              "enum": [
                "sent",
                "failed",
                "skipped"
              ]
            },
            "error_message": {
              "type": "string",
              "nullable": true
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            }
          }
        }
      }
    },
    "tags": [
      {
        "name": "Health",
        "description": "Health check"
      },
      {
        "name": "Auth",
        "description": "Authentication and user management. Accounts can be soft-deactivated (status=deactivated), and deactivated users cannot login or access protected endpoints. Password reset: POST /auth/forgot-password (email) receives a 6-digit code by email; POST /auth/reset-password with email, code, and new password."
      },
      {
        "name": "Offers",
        "description": "Travel offers and reviews"
      },
      {
        "name": "Bookings",
        "description": "Booking management"
      },
      {
        "name": "Custom Trips",
        "description": "Custom trip request workflow"
      },
      {
        "name": "Admin",
        "description": "Admin dashboard and management"
      },
      {
        "name": "Notifications",
        "description": "FCM token registration, notification history, and push delivery"
      }
    ],
    "paths": {
      "/health": {
        "get": {
          "summary": "Health check",
          "tags": [
            "Health"
          ],
          "responses": {
            "200": {
              "description": "API is running",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ApiSuccess"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/auth/signup": {
        "post": {
          "summary": "Register a new user",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SignupRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "User created",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/AuthResponse"
                  }
                }
              }
            },
            "400": {
              "description": "Validation error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ValidationErrors"
                  }
                }
              }
            },
            "422": {
              "description": "User already exists"
            }
          }
        }
      },
      "/api/v1/auth/login": {
        "post": {
          "summary": "Login using email or phone",
          "description": "Agency admins (`role=admin`) receive a 6-digit OTP by email after password validation.\nComplete login with `POST /auth/login/verify-admin-otp` within 5 minutes.\n`superAdmin` and `user` receive a JWT immediately.\n",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LoginRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Login successful or OTP challenge started (admin)",
              "content": {
                "application/json": {
                  "schema": {
                    "oneOf": [
                      {
                        "$ref": "#/components/schemas/AuthResponse"
                      },
                      {
                        "type": "object",
                        "properties": {
                          "success": {
                            "type": "boolean",
                            "example": true
                          },
                          "requiresTwoFactor": {
                            "type": "boolean",
                            "example": true
                          },
                          "requiresOtp": {
                            "type": "boolean",
                            "example": true
                          },
                          "otpChannel": {
                            "type": "string",
                            "enum": [
                              "email",
                              "dev"
                            ]
                          },
                          "twoFactorToken": {
                            "type": "string"
                          },
                          "user": {
                            "type": "object"
                          },
                          "message": {
                            "type": "string"
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
            "400": {
              "description": "Validation error"
            },
            "401": {
              "description": "Invalid credentials"
            },
            "403": {
              "description": "Account is deactivated"
            },
            "503": {
              "description": "OTP email could not be sent"
            }
          }
        }
      },
      "/api/v1/auth/login/verify-admin-otp": {
        "post": {
          "summary": "Verify agency admin email OTP",
          "description": "Exchange `twoFactorToken` + 6-digit OTP for app JWT. OTP expires after 5 minutes.",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "twoFactorToken"
                  ],
                  "properties": {
                    "twoFactorToken": {
                      "type": "string"
                    },
                    "otp": {
                      "type": "string",
                      "pattern": "^\\d{6}$"
                    },
                    "code": {
                      "type": "string",
                      "pattern": "^\\d{6}$",
                      "description": "Alias for otp"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "OTP verified; login completed",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/AuthResponse"
                  }
                }
              }
            },
            "400": {
              "description": "Invalid or expired OTP session"
            }
          }
        }
      },
      "/api/v1/auth/user": {
        "get": {
          "summary": "Get current authenticated user",
          "tags": [
            "Auth"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "User profile"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Account is deactivated"
            }
          }
        },
        "put": {
          "summary": "Update current authenticated user",
          "tags": [
            "Auth"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "firstName": {
                      "type": "string"
                    },
                    "lastName": {
                      "type": "string"
                    },
                    "phone": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "User updated"
            },
            "400": {
              "description": "Validation error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Account is deactivated"
            }
          }
        },
        "delete": {
          "summary": "Deactivate current authenticated user (soft delete)",
          "description": "Soft-deletes the current account by setting `users.status = deactivated`.\nDeactivated users can no longer login or access protected endpoints.\n",
          "tags": [
            "Auth"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Account deactivated (or already deactivated)"
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "User not found"
            }
          }
        }
      },
      "/api/v1/auth/user/password": {
        "put": {
          "summary": "Change current user password",
          "tags": [
            "Auth"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "currentPassword",
                    "newPassword"
                  ],
                  "properties": {
                    "currentPassword": {
                      "type": "string"
                    },
                    "newPassword": {
                      "type": "string",
                      "minLength": 6
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Password changed"
            },
            "400": {
              "description": "Validation error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Account is deactivated"
            }
          }
        }
      },
      "/api/v1/auth/logout": {
        "post": {
          "summary": "Logout current user",
          "tags": [
            "Auth"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Logged out"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Account is deactivated"
            }
          }
        }
      },
      "/api/v1/auth/fcm-token": {
        "post": {
          "summary": "Register or refresh current user FCM token",
          "tags": [
            "Notifications"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FcmTokenRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Token saved/updated"
            },
            "400": {
              "description": "Validation or save error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "503": {
              "description": "Notification tables missing in DB (migration not applied)"
            }
          }
        },
        "delete": {
          "summary": "Remove current user FCM token",
          "tags": [
            "Notifications"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "fcm_token"
                  ],
                  "properties": {
                    "fcm_token": {
                      "type": "string",
                      "minLength": 10,
                      "maxLength": 4096
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "204": {
              "description": "Token removed"
            },
            "400": {
              "description": "Validation or delete error"
            },
            "401": {
              "description": "Unauthorized"
            }
          }
        }
      },
      "/api/v1/auth/forgot-password": {
        "post": {
          "summary": "Request a 6-digit password reset code",
          "description": "Sends a six-digit code to the user's email when SMTP is configured (`SMTP_HOST`, etc.).\nThe code is stored hashed; use it with `POST /auth/reset-password` together with the same email.\nIf SMTP is not configured, in **development** only the response may include `code` for testing.\n",
          "tags": [
            "Auth"
          ],
          "security": [
            {
              "idempotencyKey": []
            }
          ],
          "parameters": [
            {
              "in": "header",
              "name": "Idempotency-Key",
              "required": false,
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ForgotPasswordRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Generic success (also when email is unknown, to avoid account enumeration)",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ForgotPasswordResponse"
                  }
                }
              }
            },
            "400": {
              "description": "Validation error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ValidationErrors"
                  }
                }
              }
            },
            "503": {
              "description": "SMTP configured but sending failed; reset state rolled back",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/auth/reset-password": {
        "post": {
          "summary": "Set a new password using email and 6-digit code",
          "description": "Validates `email` + `code` against the stored hash and expiry, then sets `password` and returns a JWT.\n",
          "tags": [
            "Auth"
          ],
          "security": [
            {
              "idempotencyKey": []
            }
          ],
          "parameters": [
            {
              "in": "header",
              "name": "Idempotency-Key",
              "required": false,
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResetPasswordRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Password reset successful; session token returned",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/AuthResponse"
                  }
                }
              }
            },
            "400": {
              "description": "Validation error or invalid/expired code",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ValidationErrors"
                  }
                }
              }
            },
            "500": {
              "description": "Database error"
            }
          }
        }
      },
      "/api/v1/offers": {
        "get": {
          "summary": "List offers",
          "tags": [
            "Offers"
          ],
          "description": "Supports Redis cache when REDIS_URL is configured.",
          "parameters": [
            {
              "in": "query",
              "name": "location",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "type",
              "schema": {
                "type": "string",
                "enum": [
                  "standard",
                  "custom",
                  "special",
                  "activity"
                ]
              }
            },
            {
              "in": "query",
              "name": "tag",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "available",
              "schema": {
                "type": "boolean"
              }
            },
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
                "default": 50
              }
            },
            {
              "in": "query",
              "name": "offset",
              "schema": {
                "type": "integer",
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Offers list",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "offers": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/Offer"
                        }
                      },
                      "count": {
                        "type": "integer"
                      },
                      "limit": {
                        "type": "integer"
                      },
                      "offset": {
                        "type": "integer"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "post": {
          "summary": "Create offer (admin)",
          "tags": [
            "Offers"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OfferCreate"
                }
              },
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "required": [
                    "title",
                    "location",
                    "type"
                  ],
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "location": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "standard",
                        "custom",
                        "special",
                        "activity"
                      ]
                    },
                    "description": {
                      "type": "string"
                    },
                    "duration": {
                      "type": "string"
                    },
                    "places": {
                      "type": "string"
                    },
                    "available": {
                      "type": "string"
                    },
                    "total_price": {
                      "type": "string"
                    },
                    "currency": {
                      "type": "string"
                    },
                    "amenities": {
                      "type": "string",
                      "description": "JSON array string"
                    },
                    "itinerary": {
                      "type": "string",
                      "description": "JSON array string"
                    },
                    "image": {
                      "type": "string",
                      "format": "binary"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Offer created"
            },
            "400": {
              "description": "Validation or upload error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            }
          }
        }
      },
      "/api/v1/offers/{id}": {
        "get": {
          "summary": "Get offer by id",
          "tags": [
            "Offers"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Offer details"
            },
            "400": {
              "description": "Invalid UUID"
            },
            "404": {
              "description": "Offer not found"
            }
          }
        },
        "put": {
          "summary": "Update offer (admin)",
          "tags": [
            "Offers"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OfferCreate"
                }
              },
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "image": {
                      "type": "string",
                      "format": "binary"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Offer updated"
            },
            "400": {
              "description": "Validation/upload error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            }
          }
        },
        "delete": {
          "summary": "Delete offer (admin)",
          "tags": [
            "Offers"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Offer deleted"
            },
            "400": {
              "description": "Invalid request"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            }
          }
        }
      },
      "/api/v1/offers/{id}/reviews": {
        "get": {
          "summary": "List offer reviews",
          "tags": [
            "Offers"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Reviews list"
            }
          }
        },
        "post": {
          "summary": "Add offer review",
          "tags": [
            "Offers"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ReviewBody"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Review created"
            },
            "400": {
              "description": "Validation error"
            },
            "401": {
              "description": "Unauthorized"
            }
          }
        }
      },
      "/api/v1/offers/{id}/reviews/{reviewId}": {
        "delete": {
          "summary": "Delete review",
          "tags": [
            "Offers"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            },
            {
              "in": "path",
              "name": "reviewId",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Review deleted"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Not authorized"
            },
            "404": {
              "description": "Review not found"
            }
          }
        }
      },
      "/api/v1/offers/{id}/tags": {
        "get": {
          "summary": "List offer tags",
          "tags": [
            "Offers"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Tags list"
            }
          }
        },
        "post": {
          "summary": "Add offer tag (admin)",
          "tags": [
            "Offers"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TagBody"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Tag created"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            }
          }
        }
      },
      "/api/v1/bookings": {
        "get": {
          "summary": "List all bookings (admin)",
          "tags": [
            "Bookings"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "pending",
                  "confirmed",
                  "validated",
                  "ready_for_agency",
                  "completed",
                  "cancelled"
                ]
              }
            },
            {
              "in": "query",
              "name": "payment_status",
              "schema": {
                "type": "string",
                "enum": [
                  "pending",
                  "under_review",
                  "paid",
                  "failed",
                  "refunded"
                ]
              }
            },
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
                "default": 50
              }
            },
            {
              "in": "query",
              "name": "offset",
              "schema": {
                "type": "integer",
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Bookings list"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            }
          }
        },
        "post": {
          "summary": "Create booking",
          "tags": [
            "Bookings"
          ],
          "security": [
            {
              "bearerAuth": []
            },
            {
              "idempotencyKey": []
            },
            {
              "hmacSignature": []
            },
            {
              "hmacTimestamp": []
            }
          ],
          "parameters": [
            {
              "in": "header",
              "name": "Idempotency-Key",
              "required": false,
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "header",
              "name": "x-signature",
              "required": false,
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "header",
              "name": "x-timestamp",
              "required": false,
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BookingCreate"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Booking created"
            },
            "400": {
              "description": "Validation / business error"
            },
            "401": {
              "description": "Unauthorized"
            }
          }
        }
      },
      "/api/v1/bookings/user/{userId}": {
        "get": {
          "summary": "Get bookings for user",
          "tags": [
            "Bookings"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "userId",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "User bookings"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden"
            }
          }
        }
      },
      "/api/v1/bookings/{id}/deposit-receipt": {
        "post": {
          "summary": "Upload 1000 DZD deposit receipt (client)",
          "description": "Booking owner uploads a receipt image after agency validation (`status=validated`).\nSets `payment_status` to `under_review`. Super admin confirms via PUT status with `paid`.\nAllowed when `payment_status` is `pending` or `failed`.\n",
          "tags": [
            "Bookings"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "required": [
                    "receipt"
                  ],
                  "properties": {
                    "receipt": {
                      "type": "string",
                      "format": "binary",
                      "description": "Receipt image (JPEG, PNG, GIF, WebP, max 5MB)"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Receipt uploaded; booking under review"
            },
            "400": {
              "description": "Invalid state or file"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Not the booking owner"
            }
          }
        }
      },
      "/api/v1/bookings/{id}/status": {
        "put": {
          "summary": "Update booking status (admin)",
          "description": "Can also update `payment_status` in the same request body.\n**paid** requires `payment_status=under_review` and a client-uploaded `deposit_receipt_url` (superAdmin only).\n**failed** rejects a receipt (superAdmin only); client may re-upload.\nWhen the booking already has `payment_status=paid` (payment confirmed), only **superAdmin**\nmay change `status` (including cancel) or `payment_status`; agency **admin** receives 403.\n",
          "tags": [
            "Bookings"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BookingStatusUpdate"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Booking updated"
            },
            "400": {
              "description": "Validation error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only, or agency admin blocked when payment_status is paid"
            }
          }
        }
      },
      "/api/v1/custom-trips": {
        "post": {
          "summary": "Create custom trip request",
          "tags": [
            "Custom Trips"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CustomTripCreate"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Custom trip request created"
            },
            "400": {
              "description": "Validation error"
            },
            "401": {
              "description": "Unauthorized"
            }
          }
        },
        "get": {
          "summary": "List all custom trip requests (admin)",
          "tags": [
            "Custom Trips"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "pending",
                  "under_review",
                  "approved",
                  "rejected",
                  "cancelled"
                ]
              }
            },
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
                "default": 50
              }
            },
            {
              "in": "query",
              "name": "offset",
              "schema": {
                "type": "integer",
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Custom trip request list"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            }
          }
        }
      },
      "/api/v1/custom-trips/my": {
        "get": {
          "summary": "List my custom trip requests",
          "tags": [
            "Custom Trips"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "pending",
                  "under_review",
                  "approved",
                  "rejected",
                  "cancelled"
                ]
              }
            },
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
                "default": 50
              }
            },
            {
              "in": "query",
              "name": "offset",
              "schema": {
                "type": "integer",
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "My custom trip request list"
            },
            "401": {
              "description": "Unauthorized"
            }
          }
        }
      },
      "/api/v1/custom-trips/{id}/status": {
        "put": {
          "summary": "Update custom trip request status (admin)",
          "tags": [
            "Custom Trips"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CustomTripStatusUpdate"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Custom trip request updated"
            },
            "400": {
              "description": "Validation error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            }
          }
        }
      },
      "/api/v1/admin/users": {
        "get": {
          "summary": "List users (admin)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "search",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "role",
              "schema": {
                "type": "string",
                "enum": [
                  "user",
                  "admin",
                  "superAdmin"
                ]
              }
            },
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
                "default": 50
              }
            },
            {
              "in": "query",
              "name": "offset",
              "schema": {
                "type": "integer",
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Users list"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            }
          }
        }
      },
      "/api/v1/admin/users/{id}": {
        "get": {
          "summary": "Get user by id (admin)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "User detail"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            },
            "404": {
              "description": "User not found"
            }
          }
        }
      },
      "/api/v1/admin/users/{id}/role": {
        "patch": {
          "summary": "Update user role (super admin only)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "role"
                  ],
                  "properties": {
                    "role": {
                      "type": "string",
                      "enum": [
                        "user",
                        "admin",
                        "superAdmin"
                      ]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Role updated"
            },
            "400": {
              "description": "Validation error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Super admin only"
            }
          }
        }
      },
      "/api/v1/admin/admins": {
        "post": {
          "summary": "Create agency admin (super admin only)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "firstName",
                    "lastName",
                    "phone",
                    "email",
                    "password"
                  ],
                  "properties": {
                    "firstName": {
                      "type": "string"
                    },
                    "lastName": {
                      "type": "string"
                    },
                    "phone": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string",
                      "format": "email"
                    },
                    "password": {
                      "type": "string",
                      "minLength": 6
                    },
                    "agency_name": {
                      "type": "string",
                      "nullable": true
                    },
                    "agency_logo_url": {
                      "type": "string",
                      "nullable": true
                    },
                    "doc_agrement_url": {
                      "type": "string",
                      "nullable": true
                    },
                    "doc_registre_commerce_url": {
                      "type": "string",
                      "nullable": true
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Admin created"
            },
            "400": {
              "description": "Validation or DB error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Super admin only"
            },
            "409": {
              "description": "Email or phone already exists"
            }
          }
        },
        "get": {
          "summary": "List agency admins (super admin only)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "search",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
                "default": 50
              }
            },
            {
              "in": "query",
              "name": "offset",
              "schema": {
                "type": "integer",
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Admin users list"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Super admin only"
            }
          }
        }
      },
      "/api/v1/admin/admins/{id}": {
        "get": {
          "summary": "Get agency admin by id (super admin only)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Admin detail"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Super admin only"
            },
            "404": {
              "description": "Admin user not found"
            }
          }
        },
        "patch": {
          "summary": "Update agency admin (super admin only)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "firstName": {
                      "type": "string"
                    },
                    "lastName": {
                      "type": "string"
                    },
                    "phone": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string",
                      "format": "email"
                    },
                    "password": {
                      "type": "string",
                      "minLength": 6
                    },
                    "agency_name": {
                      "type": "string",
                      "nullable": true
                    },
                    "agency_logo_url": {
                      "type": "string",
                      "nullable": true
                    },
                    "doc_agrement_url": {
                      "type": "string",
                      "nullable": true
                    },
                    "doc_registre_commerce_url": {
                      "type": "string",
                      "nullable": true
                    },
                    "agency_verification_status": {
                      "type": "string",
                      "enum": [
                        "pending",
                        "approved",
                        "rejected"
                      ]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Admin updated"
            },
            "400": {
              "description": "Validation or DB error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Super admin only"
            },
            "404": {
              "description": "Admin user not found"
            }
          }
        },
        "delete": {
          "summary": "Deactivate agency admin (super admin only)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Admin deactivated"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Super admin only"
            },
            "404": {
              "description": "Admin user not found"
            }
          }
        }
      },
      "/api/v1/admin/stats": {
        "get": {
          "summary": "Admin dashboard stats",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Stats payload"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            }
          }
        }
      },
      "/api/v1/admin/notifications/broadcast": {
        "post": {
          "summary": "Broadcast push notification to all users with FCM tokens (admin)",
          "tags": [
            "Notifications",
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NotificationSendRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Broadcast queued/sent with summary"
            },
            "400": {
              "description": "Validation or send error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            },
            "503": {
              "description": "Notification tables missing in DB (migration not applied)"
            }
          }
        }
      },
      "/api/v1/admin/notifications/users/{id}/send": {
        "post": {
          "summary": "Send push notification to one user (admin)",
          "tags": [
            "Notifications",
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NotificationSendRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Notification sent/logged for target user"
            },
            "400": {
              "description": "Validation or send error"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Admin only"
            },
            "404": {
              "description": "User not found"
            },
            "503": {
              "description": "Notification tables missing in DB (migration not applied)"
            }
          }
        }
      },
      "/api/v1/notifications": {
        "get": {
          "summary": "Get current user notification history",
          "tags": [
            "Notifications"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100,
                "default": 50
              }
            },
            {
              "in": "query",
              "name": "offset",
              "schema": {
                "type": "integer",
                "minimum": 0,
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Notification history list",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "items": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/NotificationHistoryItem"
                        }
                      },
                      "count": {
                        "type": "integer"
                      },
                      "limit": {
                        "type": "integer"
                      },
                      "offset": {
                        "type": "integer"
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "503": {
              "description": "Notification tables missing in DB (migration not applied)"
            }
          }
        }
      }
    }
  },
  "customOptions": {}
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}

