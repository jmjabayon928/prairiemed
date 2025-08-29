package com.prairiemed.billing.dto

import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.UUID

data class BillingSummary(
    val patientId: UUID,
    val outstandingBalance: BigDecimal,
    val lastInvoiceDate: OffsetDateTime?,
    val invoices: List<InvoiceDto>
)
