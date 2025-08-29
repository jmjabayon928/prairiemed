package com.prairiemed.billing.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Entity
@Table(name = "invoices", schema = "billing")
class Invoice(

    @Id
    @Column(name = "invoice_id", nullable = false)
    var id: UUID? = null,

    @Column(name = "patient_id", nullable = false)
    var patientId: UUID? = null,

    @Column(name = "appointment_id", unique = true)
    var appointmentId: UUID? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: InvoiceStatus = InvoiceStatus.DRAFT,

    @Column(name = "total_amount", precision = 12, scale = 2, nullable = false)
    var totalAmount: BigDecimal = BigDecimal.ZERO,

    @Column(name = "currency", length = 3, nullable = false)
    var currency: String = "USD",

    @Column(name = "created_at", nullable = false)
    var createdAt: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC),
) {
    @OneToMany(fetch = FetchType.LAZY, cascade = [CascadeType.ALL])
    @JoinColumn(name = "invoice_id")
    var items: MutableList<InvoiceItem> = mutableListOf()

    @OneToMany(fetch = FetchType.LAZY, cascade = [CascadeType.ALL])
    @JoinColumn(name = "invoice_id")
    var payments: MutableList<Payment> = mutableListOf()
}

enum class InvoiceStatus { DRAFT, SENT, PAID, VOID }
