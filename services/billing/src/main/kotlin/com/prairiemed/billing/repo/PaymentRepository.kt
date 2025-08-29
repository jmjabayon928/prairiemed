package com.prairiemed.billing.repo

import com.prairiemed.billing.domain.Payment
import org.springframework.data.jpa.repository.JpaRepository
import java.util.*

interface PaymentRepository : JpaRepository<Payment, UUID> {
    fun findByInvoiceIdIn(invoiceIds: Collection<UUID>): List<Payment>
}
