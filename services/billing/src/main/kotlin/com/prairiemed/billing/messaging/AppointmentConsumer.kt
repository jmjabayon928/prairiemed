package com.prairiemed.billing.messaging

import com.fasterxml.jackson.databind.ObjectMapper
import com.prairiemed.billing.domain.Invoice
import com.prairiemed.billing.domain.InvoiceStatus
import com.prairiemed.billing.events.InvoiceCreatedEvent
import com.prairiemed.billing.repo.InvoiceRepository
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.*

@Component
class AppointmentConsumer(
    private val invoiceRepository: InvoiceRepository,
    private val kafkaTemplate: KafkaTemplate<String, String>,
    private val objectMapper: ObjectMapper,
) {

    private val log = LoggerFactory.getLogger(AppointmentConsumer::class.java)

    data class AppointmentCreatedEvent(
        val id: String?,
        val patientId: String?,
        val scheduledStart: String? = null,
        val scheduledEnd: String? = null,
        val reason: String? = null,
        val status: String? = null,
        val ts: Long? = null,
    )

    @KafkaListener(topics = ["appointment.created"], groupId = "\${spring.kafka.consumer.group-id}")
    fun handleAppointmentCreated(message: String) {
        val evt = runCatching { objectMapper.readValue(message, AppointmentCreatedEvent::class.java) }
            .getOrElse {
                log.warn("Failed to parse appointment.created payload: {}", it.message)
                return
            }

        val patient = evt.patientId?.let { runCatching { UUID.fromString(it) }.getOrNull() }
        if (patient == null) {
            log.warn("appointment.created missing/invalid patientId: {}", evt.patientId)
            return
        }

        val apptId = evt.id?.let { runCatching { UUID.fromString(it) }.getOrNull() }
        if (apptId != null && invoiceRepository.findByAppointmentId(apptId) != null) {
            log.info("Invoice already exists for appointment {}", apptId)
            return
        }

        val inv = Invoice(
            id = UUID.randomUUID(),
            patientId = patient,
            appointmentId = apptId,
            status = InvoiceStatus.DRAFT,
            totalAmount = BigDecimal.ZERO,
            currency = "USD",
            createdAt = OffsetDateTime.now(ZoneOffset.UTC)
        )

        val saved = invoiceRepository.save(inv)
        log.info("Created draft invoice {} for patient {}", saved.id, saved.patientId)

        // Emit invoice.created for downstream consumers (Node worker, etc.)
        val outEvt = InvoiceCreatedEvent(
            id = saved.id!!,
            patientId = saved.patientId!!,
            appointmentId = saved.appointmentId,
            status = saved.status.name,
            totalAmount = saved.totalAmount,
            currency = saved.currency,
            createdAt = saved.createdAt
        )

        runCatching {
            val key = saved.id.toString()
            val payload = objectMapper.writeValueAsString(outEvt)
            kafkaTemplate.send("invoice.created", key, payload)
        }.onFailure { ex ->
            log.warn("Failed to publish invoice.created for {}: {}", saved.id, ex.message)
        }
    }
}
