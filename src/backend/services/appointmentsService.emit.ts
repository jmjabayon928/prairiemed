import { emit } from '../events/kafka';


export async function emitAppointmentCreated(appt: { id: string; patientId: string }) {
await emit('appointment.created', { id: appt.id, patientId: appt.patientId, ts: Date.now() });
}