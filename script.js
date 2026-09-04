const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace('  auditLogs      AuditLog[]             @relation("AuditUser")', '  auditLogs      AuditLog[]             @relation("AuditUser")\n  ownerConversations Conversation[] @relation("OwnerConversations")\n  sentMessages   Message[]      @relation("SentMessages")');

schema = schema.replace('  appointments   Appointment[]\n}', '  appointments   Appointment[]\n  conversations  Conversation[]\n}');

schema = schema.replace('  medicalRecords MedicalRecord[]\n}', '  medicalRecords MedicalRecord[]\n  conversations  Conversation[] @relation("VetConversations")\n}');

schema = schema.replace('  createdAt DateTime          @default(now())\n\n  @@index([vetId, dateTime])', '  createdAt DateTime          @default(now())\n  conversation Conversation?\n\n  @@index([vetId, dateTime])');

const newModels = `
model Conversation {
  id              String      @id @default(uuid())
  appointmentId   String?     @unique
  appointment     Appointment? @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
  petId           String?
  pet             Pet?        @relation(fields: [petId], references: [id], onDelete: SetNull)
  ownerId         String?
  owner           User?       @relation("OwnerConversations", fields: [ownerId], references: [id], onDelete: SetNull)
  veterinarianId  String?
  veterinarian    Veterinarian? @relation("VetConversations", fields: [veterinarianId], references: [id], onDelete: SetNull)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  messages        Message[]

  @@index([ownerId])
  @@index([veterinarianId])
  @@index([petId])
}

model Message {
  id              String       @id @default(uuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId        String?
  sender          User?        @relation("SentMessages", fields: [senderId], references: [id], onDelete: SetNull)
  content         String
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  readAt          DateTime?

  @@index([conversationId, createdAt])
}
`;

fs.writeFileSync('prisma/schema.prisma', schema + '\n' + newModels);
