package com.prairiemed.billing.events

import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.UUID

data class InvoiceCreatedEvent(
    val id: UUID,
    val patientId: UUID,
    val appointmentId: UUID?,
    val status: String,
    val totalAmount: BigDecimal,
    val currency: String,
    val createdAt: OffsetDateTime
)
