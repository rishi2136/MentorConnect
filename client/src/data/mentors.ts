export type Mentor = {
  id: number | string
  name: string
  role: string
  company: string
  specialty: string
  location: string
  experience: string
  rating: number
  ratingCount?: number
  sessions: number
  image: string
  available: boolean
  profileId?: string
  charges?: number
  isFreeSessionEnabled?: boolean
  aboutMe?: string
  timezone?: string
  availability?: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
  expertise?: string[]
  skills?: string[]
}

export type Course = { title: string; category: string; price: number; image: string; lessons: number; hours: number }

export const mentors: Mentor[] = [
  { id: 1, name: 'Maya Chen', role: 'Product Design Lead', company: 'Northstar', specialty: 'Product Design', location: 'New York, NY', experience: '12 years', rating: 4.9, sessions: 86, image: 'https://i.pravatar.cc/160?img=47', available: true },
  { id: 2, name: 'Julian Brooks', role: 'Staff Software Engineer', company: 'Stripe', specialty: 'Engineering', location: 'Austin, TX', experience: '10 years', rating: 5, sessions: 124, image: 'https://i.pravatar.cc/160?img=12', available: true },
  { id: 3, name: 'Aisha Williams', role: 'Growth Marketing Director', company: 'Lumen', specialty: 'Marketing', location: 'London, UK', experience: '9 years', rating: 4.8, sessions: 67, image: 'https://i.pravatar.cc/160?img=32', available: false },
  { id: 4, name: 'Elias Romero', role: 'Founder and CEO', company: 'Gatherly', specialty: 'Entrepreneurship', location: 'Miami, FL', experience: '15 years', rating: 4.9, sessions: 103, image: 'https://i.pravatar.cc/160?img=11', available: true },
  { id: 5, name: 'Sofia Patel', role: 'Data Science Manager', company: 'Arc Labs', specialty: 'Data and AI', location: 'San Francisco, CA', experience: '8 years', rating: 4.7, sessions: 51, image: 'https://i.pravatar.cc/160?img=23', available: true },
  { id: 6, name: 'Theo Martin', role: 'Finance Partner', company: 'Ridge Capital', specialty: 'Finance', location: 'Chicago, IL', experience: '11 years', rating: 4.9, sessions: 78, image: 'https://i.pravatar.cc/160?img=68', available: false },
]