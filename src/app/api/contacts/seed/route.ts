import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// A curated list of common Indian names for realistic-looking seed data
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Advait',
  'Priya', 'Ananya', 'Isha', 'Khushi', 'Nisha', 'Sneha', 'Riya', 'Pooja',
  'Kavya', 'Meera', 'Divya', 'Sanya', 'Tanvi', 'Shreya', 'Aishwarya',
  'Rahul', 'Amit', 'Vijay', 'Suresh', 'Ramesh', 'Deepak', 'Manoj', 'Rajesh',
  'Ankur', 'Nikhil', 'Rohit', 'Gaurav', 'Tarun', 'Varun', 'Karan', 'Mohit',
]

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Joshi', 'Mehta',
  'Shah', 'Yadav', 'Mishra', 'Pandey', 'Chauhan', 'Nair', 'Pillai', 'Iyer',
  'Reddy', 'Rao', 'Naidu', 'Agarwal', 'Saxena', 'Shukla', 'Tiwari', 'Dubey',
  'Banerjee', 'Chatterjee', 'Mukherjee', 'Das', 'Roy', 'Sen', 'Bose', 'Ghosh',
]

const COMPANIES = [
  'Tech Solutions Pvt Ltd', 'Infosys Ltd', 'Wipro Technologies', 'TCS',
  'HCL Technologies', 'Reliance Industries', 'Tata Motors', 'Mahindra Group',
  'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'SBI', 'Bajaj Finance',
  'Flipkart', 'Swiggy', 'Zomato', 'OYO Rooms', 'Paytm', 'PhonePe',
  'MakeMyTrip', 'Nykaa', 'Meesho', 'upGrad', 'BYJU\'s', 'Unacademy',
  null, null, null, // some contacts without company
]

// Indian mobile number prefixes (valid ranges)
const MOBILE_PREFIXES = [
  '91', '92', '93', '94', '95', '96', '97', '98', '99', '70', '71', '72',
  '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84',
  '85', '86', '87', '88', '89', '63', '64', '65', '66', '67', '68', '69',
]

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateIndianPhone(): string {
  const prefix = randomElement(MOBILE_PREFIXES)
  const remaining = Math.floor(Math.random() * 90000000 + 10000000).toString()
  return `+91${prefix}${remaining.slice(0, 8)}`
}

function generateEmail(firstName: string, lastName: string): string | null {
  if (Math.random() < 0.3) return null // 30% no email
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com']
  const num = Math.random() < 0.4 ? Math.floor(Math.random() * 999).toString() : ''
  return `${firstName.toLowerCase()}${lastName.toLowerCase()}${num}@${randomElement(domains)}`
}

/**
 * POST /api/contacts/seed
 * Seeds N random Indian contacts into the DB for the authenticated user.
 * Body: { count?: number }  (default 20, max 100)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const count = Math.min(Math.max(Number(body.count) || 20, 1), 100)

    const contacts = Array.from({ length: count }, () => {
      const firstName = randomElement(FIRST_NAMES)
      const lastName = randomElement(LAST_NAMES)
      return {
        user_id: user.id,
        name: `${firstName} ${lastName}`,
        phone: generateIndianPhone(),
        email: generateEmail(firstName, lastName),
        company: randomElement(COMPANIES as (string | null)[]),
        notes: null,
      }
    })

    // Use upsert with onConflict on phone so re-running doesn't duplicate
    const { data, error } = await supabase
      .from('contacts')
      .upsert(contacts, { onConflict: 'phone', ignoreDuplicates: true })
      .select('id')

    if (error) {
      console.error('Seed error:', error)
      return NextResponse.json(
        { error: `Failed to seed contacts: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length ?? 0,
      requested: count,
    })
  } catch (error) {
    console.error('Seed contacts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
