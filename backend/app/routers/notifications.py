from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.routers.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=List[NotificationResponse],
    summary="List notifications for current authenticated user"
)
def get_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    limit: int = Query(50, ge=1, le=200, description="Max notifications to fetch"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve notifications owned by the authenticated user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    return notifications


@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a notification as read"
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a specific notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or unauthorized access"
        )

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.put(
    "/read-all",
    summary="Mark all notifications as read for current user"
)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications belonging to the current user as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "All notifications marked as read"}
