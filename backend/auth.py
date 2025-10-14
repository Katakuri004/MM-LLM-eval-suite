"""
Authentication and authorization for the LMMS-Eval Dashboard.

This module handles JWT token validation, user authentication, and
authorization checks using Supabase Auth.
"""

import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog
from config import settings, security_config
from database import get_database, DatabaseManager

# Configure structured logging
logger = structlog.get_logger(__name__)

# HTTP Bearer token security scheme
security = HTTPBearer()


class AuthenticationError(Exception):
    """Custom exception for authentication errors."""
    pass


class AuthorizationError(Exception):
    """Custom exception for authorization errors."""
    pass


class AuthManager:
    """
    Authentication manager for handling JWT tokens and user authentication.
    
    Provides methods for token validation, user authentication, and
    authorization checks using Supabase Auth.
    """
    
    def __init__(self):
        """Initialize authentication manager."""
        self.secret_key = settings.secret_key
        self.algorithm = settings.algorithm
        self.token_expire_minutes = settings.access_token_expire_minutes
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """
        Create JWT access token.
        
        Args:
            data: Data to encode in the token
            
        Returns:
            str: Encoded JWT token
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.token_expire_minutes)
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode JWT token.
        
        Args:
            token: JWT token to verify
            
        Returns:
            Dict containing token payload
            
        Raises:
            AuthenticationError: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired", token=token[:20] + "...")
            raise AuthenticationError("Token has expired")
        except jwt.JWTError as e:
            logger.warning("Invalid token", error=str(e), token=token[:20] + "...")
            raise AuthenticationError("Invalid token")
    
    async def get_current_user(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> Dict[str, Any]:
        """
        Get current authenticated user from JWT token.
        
        Args:
            credentials: HTTP authorization credentials
            
        Returns:
            Dict containing user information
            
        Raises:
            HTTPException: If authentication fails
        """
        try:
            # Verify the token
            payload = self.verify_token(credentials.credentials)
            
            # Extract user information from token
            user_id = payload.get("sub")
            if not user_id:
                raise AuthenticationError("Invalid token payload")
            
            # Get user details from database
            db = await get_database()
            user_result = await db.execute_query(
                table="auth.users",
                operation="select",
                filters={"id": user_id}
            )
            
            if not user_result["success"] or not user_result["data"]:
                raise AuthenticationError("User not found")
            
            user = user_result["data"][0]
            
            logger.info("User authenticated successfully", user_id=user_id)
            return user
            
        except AuthenticationError as e:
            logger.warning("Authentication failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error("Unexpected authentication error", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal authentication error"
            )
    
    async def check_user_permissions(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str
    ) -> bool:
        """
        Check if user has permission to perform action on resource.
        
        Args:
            user_id: User ID
            resource_type: Type of resource (run, model, benchmark)
            resource_id: Resource ID
            action: Action to perform (read, write, delete)
            
        Returns:
            bool: True if user has permission, False otherwise
        """
        try:
            # For now, implement basic ownership check
            # In a more complex system, you would check against a permissions table
            
            if resource_type == "run":
                db = await get_database()
                run = await db.get_run_by_id(resource_id)
                if not run:
                    return False
                
                # Check if user owns the run
                return run.get("created_by") == user_id
            
            elif resource_type == "model":
                # Models are typically read-only for all users
                return action == "read"
            
            elif resource_type == "benchmark":
                # Benchmarks are typically read-only for all users
                return action == "read"
            
            else:
                logger.warning(
                    "Unknown resource type for permission check",
                    resource_type=resource_type,
                    user_id=user_id
                )
                return False
                
        except Exception as e:
            logger.error(
                "Error checking user permissions",
                error=str(e),
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                action=action
            )
            return False
    
    async def require_permission(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str
    ) -> None:
        """
        Require that user has permission to perform action on resource.
        
        Args:
            user_id: User ID
            resource_type: Type of resource
            resource_id: Resource ID
            action: Action to perform
            
        Raises:
            AuthorizationError: If user lacks permission
        """
        has_permission = await self.check_user_permissions(
            user_id, resource_type, resource_id, action
        )
        
        if not has_permission:
            logger.warning(
                "User lacks permission for action",
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                action=action
            )
            raise AuthorizationError(
                f"User lacks permission to {action} {resource_type} {resource_id}"
            )


# Global authentication manager instance
auth_manager = AuthManager()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency to get current authenticated user.
    
    Args:
        credentials: HTTP authorization credentials
        
    Returns:
        Dict containing user information
    """
    return await auth_manager.get_current_user(credentials)


async def require_auth(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    FastAPI dependency to require authentication.
    
    Args:
        user: Current authenticated user
        
    Returns:
        Dict containing user information
    """
    return user


async def require_permission(
    resource_type: str,
    resource_id: str,
    action: str,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    FastAPI dependency to require specific permission.
    
    Args:
        resource_type: Type of resource
        resource_id: Resource ID
        action: Action to perform
        user: Current authenticated user
        
    Returns:
        Dict containing user information
        
    Raises:
        HTTPException: If user lacks permission
    """
    try:
        await auth_manager.require_permission(
            user["id"], resource_type, resource_id, action
        )
        return user
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


def create_user_token(user_data: Dict[str, Any]) -> str:
    """
    Create JWT token for user.
    
    Args:
        user_data: User data to encode in token
        
    Returns:
        str: Encoded JWT token
    """
    return auth_manager.create_access_token(user_data)


def verify_user_token(token: str) -> Dict[str, Any]:
    """
    Verify user JWT token.
    
    Args:
        token: JWT token to verify
        
    Returns:
        Dict containing token payload
        
    Raises:
        AuthenticationError: If token is invalid
    """
    return auth_manager.verify_token(token)
