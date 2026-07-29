"""Create budgets table

Revision ID: 6fd487f4087c
Revises: 85e2b37c2e2f
Create Date: 2026-07-27 16:02:37.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6fd487f4087c'
down_revision: Union[str, Sequence[str], None] = '85e2b37c2e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('monthly_limit', sa.Float(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'category', 'month', 'year', name='uq_user_category_month_year')
    )
    op.create_index(op.f('ix_budgets_id'), 'budgets', ['id'], unique=False)
    op.create_index(op.f('ix_budgets_user_id'), 'budgets', ['user_id'], unique=False)
    op.create_index(op.f('ix_budgets_category'), 'budgets', ['category'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_budgets_category'), table_name='budgets')
    op.drop_index(op.f('ix_budgets_user_id'), table_name='budgets')
    op.drop_index(op.f('ix_budgets_id'), table_name='budgets')
    op.drop_table('budgets')
