package com.prairiemed.billing.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "payments", schema = "billing")
data class Payment(
    @Id
    @Column(name = "payment_id")
    val id: UUID = UUID.randomUUID(),

    @Column(name = "invoice_id", nullable = false)
    val invoiceId: UUID,

    @Column(name = "amount", nullable = false)
    var amount: BigDecimal,

    @Column(name = "currency", nullable = false)
    var currency: String = "USD",

    @Column(name = "paid_at", nullable = false)
    var paidAt: OffsetDateTime = OffsetDateTime.now()
)
