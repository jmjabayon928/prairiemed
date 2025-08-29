package com.prairiemed.billing.web

import com.prairiemed.billing.service.BillingService
import com.prairiemed.billing.service.PatientBillingSummary
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/billing")
class BillingController(
    private val billingService: BillingService
) {
    @GetMapping("/patients/{patientId}/summary")
    fun getSummary(@PathVariable patientId: UUID): PatientBillingSummary =
        billingService.getPatientSummary(patientId)
}
