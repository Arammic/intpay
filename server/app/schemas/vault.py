from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class AddFundsRequest(BaseModel):
    profile_id: int = Field(gt=0)
    amount: Decimal = Field(gt=0, description="Amount must be greater than zero")

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("Amount must be greater than zero")
        return value


class AddFundsResponse(BaseModel):
    profile_id: int
    vault_balance: Decimal
