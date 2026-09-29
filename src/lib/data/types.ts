export type ProjectStatus = 'Brief Submitted' | 'Reviewing' | 'Approved' | 'In Progress' | 'Review' | 'Completed'

export type ProjectMessage = { from: 'client' | 'admin' | 'creator'; text: string; at: string }
export type ProjectActivity = { type: string; text: string; at: string }
export type Delivery = { notes: string; link?: string; submittedAt: string; version: number }
export type RevisionRequest = { text: string; at: string }
export type ProjectReview = { rating: number; text: string; at: string }

export type ProjectRecord = {
  id: string
  clientEmail: string
  clientName: string
  company?: string
  service: string
  title: string
  brief: string
  goal?: string
  audience?: string
  deliverables?: string
  references?: string
  deadline?: string
  budget?: string
  creator?: string
  status: ProjectStatus
  createdAt: string
  messages: ProjectMessage[]
  activity: ProjectActivity[]
  delivery?: Delivery
  revisionRequests: RevisionRequest[]
  review?: ProjectReview
}
