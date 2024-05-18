export interface EmailProcessingJobPayload {
  type: 'EmailProcessing'
  details: {
    recipient: string
    content: string
  }
}

export interface DataMigrationJobPayload {
  type: 'DataMigration'
  details: {
    source: string
    destination: string
  }
}

export interface ReportGenerationJobPayload {
  type: 'ReportGeneration'
  details: {
    reportId: string
    requestedBy: string
  }
}

export type JobPayload = EmailProcessingJobPayload | DataMigrationJobPayload | ReportGenerationJobPayload
