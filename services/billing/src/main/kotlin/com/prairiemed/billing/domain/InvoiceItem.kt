package com.prairiemed.billing.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "invoice_items", schema = "billing")
data class InvoiceItem(
    @Id
    @Column(name = "invoice_item_id")
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    var invoice: Invoice,

    @Column(name = "description")
    var description: String? = null,

    @Column(name = "quantity", nullable = false)
    var quantity: Int = 1,

    @Column(name = "unit_price", nullable = false)
    var unitPrice: BigDecimal = BigDecimal.ZERO
)
