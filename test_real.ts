import { prisma } from './lib/db';

async function run() {
  try {
    const appointment = await prisma.appointment.findFirst({ include: { vet: true } });
    if (!appointment) return console.log('no appt');
    console.log('appt id:', appointment.id);
    let conversation = await prisma.conversation.findUnique({
      where: { appointmentId: appointment.id }
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          appointmentId: appointment.id,
          petId: appointment.petId,
          ownerId: appointment.ownerId,
          veterinarianId: appointment.vetId,
        }
      });
    }
    console.log('success:', conversation.id);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
