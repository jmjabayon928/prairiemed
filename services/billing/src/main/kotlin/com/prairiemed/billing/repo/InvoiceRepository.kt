package com.prairiemed.billing.repo

import com.prairiemed.billing.domain.Invoice
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface InvoiceRepository : JpaRepository<Invoice, UUID> {
    // for idempotency in the Kafka consumer
    fun findByAppointmentId(appointmentId: UUID): Invoice?

    // used by BillingService.kt to build the summary
    fun findByPatientIdOrderByCreatedAtDesc(patientId: UUID): List<Invoice>
}
