package com.prairiemed.billing.service

import com.prairiemed.billing.repo.InvoiceRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

data class InvoiceSummary(
    val id: UUID?,                 // <-- make nullable to match entity
    val status: String,
    val totalAmount: BigDecimal,
    val currency: String,
    val createdAt: OffsetDateTime
)

data class PatientBillingSummary(
    val patientId: UUID,
    val outstandingBalance: BigDecimal,
    val lastInvoiceDate: OffsetDateTime?,
    val invoices: List<InvoiceSummary>
)

@Service
class BillingService(
    private val invoiceRepository: InvoiceRepository
) {
    fun getPatientSummary(patientId: UUID): PatientBillingSummary {
        val invoices = invoiceRepository.findByPatientIdOrderByCreatedAtDesc(patientId)

        val summaries = invoices.map { inv ->
            InvoiceSummary(
                id = inv.invoiceId, // entity is UUID? currently
                status = inv.status,
                totalAmount = inv.totalAmount,
                currency = inv.currency,
                createdAt = OffsetDateTime.ofInstant(inv.createdAt, ZoneOffset.UTC)
            )
        }

        val lastInvoiceDate: OffsetDateTime? =
            invoices.firstOrNull()
                ?.createdAt
                ?.let { OffsetDateTime.ofInstant(it, ZoneOffset.UTC) }

        val outstanding = invoices.fold(BigDecimal.ZERO) { acc, inv -> acc + inv.totalAmount }

        return PatientBillingSummary(
            patientId = patientId,
            outstandingBalance = outstanding,
            lastInvoiceDate = lastInvoiceDate,
            invoices = summaries
        )
    }
}
