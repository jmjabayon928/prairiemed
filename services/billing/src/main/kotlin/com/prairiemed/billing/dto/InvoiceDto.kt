package com.prairiemed.billing.dto

import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.UUID

data class InvoiceDto(
    val id: UUID,
    val status: String,
    val totalAmount: BigDecimal,
    val currency: String,
    val createdAt: OffsetDateTime
)
