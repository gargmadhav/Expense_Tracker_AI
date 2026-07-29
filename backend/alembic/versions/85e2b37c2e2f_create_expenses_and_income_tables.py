"""Create expenses and income tables

Revision ID: 85e2b37c2e2f
Revises: c0814180f17a
Create Date: 2026-07-27 00:05:15.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85e2b37c2e2f'
down_revision: Union[str, Sequence[str], None] = 'c0814180f17a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create expenses table
    op.create_table(
        'expenses',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_expenses_id'), 'expenses', ['id'], unique=False)
    op.create_index(op.f('ix_expenses_user_id'), 'expenses', ['user_id'], unique=False)
    op.create_index(op.f('ix_expenses_category'), 'expenses', ['category'], unique=False)
    op.create_index(op.f('ix_expenses_transaction_date'), 'expenses', ['transaction_date'], unique=False)

    # Create income table
    op.create_table(
        'income',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=255), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_income_id'), 'income', ['id'], unique=False)
    op.create_index(op.f('ix_income_user_id'), 'income', ['user_id'], unique=False)
    op.create_index(op.f('ix_income_transaction_date'), 'income', ['transaction_date'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_income_transaction_date'), table_name='income')
    op.drop_index(op.f('ix_income_user_id'), table_name='income')
    op.drop_index(op.f('ix_income_id'), table_name='income')
    op.drop_table('income')

    op.drop_index(op.f('ix_expenses_transaction_date'), table_name='expenses')
    op.drop_index(op.f('ix_expenses_category'), table_name='expenses')
    op.drop_index(op.f('ix_expenses_user_id'), table_name='expenses')
    op.drop_index(op.f('ix_expenses_id'), table_name='expenses')
    op.drop_table('expenses')
