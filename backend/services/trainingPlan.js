const { DAY, startOfToday } = require('./helpers')

// ====== The 24 Day Cards from the trainee workbook (Section 04)
const DAY_CARDS = [
    { day: 1, title: 'STR Business Model and Key Metrics', goal: 'Understand who makes money in an STR business and calculate the 3 numbers every owner cares about.', file: 'Metrics.pdf', selfCheck: 'Can you explain RevPAR to a friend in one sentence without notes?' },
    { day: 2, title: 'The Guest Journey and the Channels', goal: 'See the business from the guest side, stage by stage, and know which stages need a human.', file: 'JourneyMap.pdf', selfCheck: 'Can you name the 4 fully automatic stages and the 5 that need human judgment?' },
    { day: 3, title: 'PMS Fundamentals (Hostaway / Hospitable)', goal: 'Be comfortable moving around a PMS, because most daily VA work happens inside it.', file: 'PMS_Checklist.pdf', selfCheck: 'List 5 things the PMS does automatically that a VA would otherwise do by hand.' },
    { day: 4, title: 'Guest Communication', goal: 'Write replies that are correct, warm and fast. This is the skill you will be graded on most.', file: 'Templates.pdf', selfCheck: 'Read your complaint replies out loud. Do they sound like a calm human or like a robot?' },
    { day: 5, title: 'Turnover, Smart Access and Monitoring', goal: 'Know how a property gets ready between guests and what to do when a lock or sensor raises an alert.', file: 'Turnover_Access.pdf', selfCheck: 'Would you catch a dirty bathroom from photos alone? What would you look for first?' },
    { day: 6, title: 'Checkpoint 1', goal: 'Show that you understand the business and can handle a real-feeling inbox.', file: 'Checkpoint1.pdf', selfCheck: 'Which message type took you the longest? That is next week\'s practice target.', checkpoint: true },
    { day: 7, title: 'Dynamic Pricing', goal: 'Run the 5-step weekly pricing routine that owners value most, because it is tied directly to money.', file: 'PricingReview.pdf', selfCheck: 'Could an owner read your summary in 30 seconds and understand what changed and why?' },
    { day: 8, title: 'Listing Optimisation', goal: 'Make listings rank higher and convert better using title, description, photos and amenities.', file: 'ListingAudit.pdf', selfCheck: 'Does your new title tell a guest the one best thing about the place in a single glance?' },
    { day: 9, title: 'Guest Screening and Damage Protection', goal: 'Treat a risk score as a signal, not a decision, and give the owner a clear recommendation.', file: 'ScreeningLog.pdf', selfCheck: 'Did any of your declines rely only on the score? If yes, go back and add a real reason.' },
    { day: 10, title: 'Reviews, Disputes and Claims', goal: 'Protect the listing\'s reputation in public and recover money after damage.', file: 'Reviews_Claim.pdf', selfCheck: 'Would a future guest reading your review reply trust this host more or less?' },
    { day: 11, title: 'Maintenance, Supply and Owner Reporting', goal: 'Turn guest problems into fixed problems, and summarise a month clearly for the owner.', file: 'Ticket_OwnerReport.pdf', selfCheck: 'Does your owner report answer "how did we do and what happens next" on one page?' },
    { day: 12, title: 'Checkpoint 2', goal: 'Fix a whole underperforming property and explain your choices in 5 minutes.', file: 'Checkpoint2.pdf', selfCheck: 'Which part did you find hardest to explain out loud? Practise that one.', checkpoint: true },
    { day: 13, title: 'How Software Talks: APIs and Webhooks', goal: 'Understand how our tools send data to each other and to our dashboard.', file: 'API_Notes.pdf', selfCheck: 'If the dashboard shows a 401 error from a tool, what is the most likely cause?' },
    { day: 14, title: 'MCP and Claude Code', goal: 'Use Claude Code to read and explain a real codebase safely.', file: 'DataFlow.pdf', selfCheck: 'Can you explain what MCP lets Claude do, in one sentence, to a non-technical person?' },
    { day: 15, title: 'The Dashboard, Panel by Panel', goal: 'Know where every number comes from and what "normal" looks like, so you notice when something is wrong.', file: 'Dashboard.pdf', selfCheck: 'If bookings stopped appearing, which panel would show it first?' },
    { day: 16, title: 'Automation Glue with n8n', goal: 'Build and debug simple workflows that connect tools together.', file: 'Workflows.zip', selfCheck: 'Could a teammate import your JSON and understand each node from its name?' },
    { day: 17, title: 'Security, Credentials and SOPs', goal: 'Learn the rules that protect clients, and write instructions others can follow.', file: 'SOP_Runbook.pdf', selfCheck: 'Could a new person follow your SOP at 2 AM without calling you?' },
    { day: 18, title: 'Checkpoint 3', goal: 'Show you can debug, make a small safe change, and follow the security rules.', file: 'Checkpoint3.pdf', selfCheck: 'Did you read every line of the diff before accepting it?', checkpoint: true },
    { day: 19, title: 'Track Assignment and Shadowing', goal: 'See real client operations and understand why seniors do what they do.', file: 'ShadowLog.pdf', selfCheck: 'Which action did you not understand? Ask about it tomorrow.' },
    { day: 20, title: 'Supervised Live Work', goal: 'Work on real messages and tasks with a senior approving every one.', file: 'DraftLog.pdf', selfCheck: 'What is your approval rate, and what one change would raise it tomorrow?' },
    { day: 21, title: 'Specialist Deep Day', goal: 'Go deep on your track with your senior, and learn your backup track from a teammate.', file: 'TrackChecklist.pdf', selfCheck: 'Could you cover your backup track alone for one shift?' },
    { day: 22, title: 'Capstone Day 1: Run a Portfolio', goal: 'Run a 4-property mock portfolio alone for a full shift while scenarios arrive at random times.', file: 'ShiftLog.pdf', selfCheck: 'Did anything wait longer than our response-time standard? Why?', checkpoint: true },
    { day: 23, title: 'Capstone Day 2: Improve It', goal: 'Finish the shift, then make the operation better.', file: 'Capstone.pdf', selfCheck: 'Is your improvement idea measurable? How many minutes or dollars would it save?', checkpoint: true },
    { day: 24, title: 'Final Presentation and Graduation', goal: 'Tell the story of your capstone honestly and plan your next 30 days.', file: 'Final.pdf', selfCheck: 'What is the one skill you want to be known for on this team?', checkpoint: true },
]

const WEEK_NAMES = ['STR Foundations and Guest Ops', 'Revenue, Risk and Reporting', 'Our Stack', 'Live Ops and Capstone']

// Training runs 6 days a week; Friday is the day off (BD work week)
const isTrainingDay = (date) => date.getUTCDay() !== 5

// ====== Where a trainee is today
const getProgress = (user) => {
    if (!user?.trainingStart) return null
    const start = new Date(user.trainingStart)
    start.setUTCHours(0, 0, 0, 0)
    const today = startOfToday()

    let done = 0
    for (let d = start.getTime(); d < today.getTime(); d += DAY) {
        if (isTrainingDay(new Date(d))) done += 1
    }
    const isDayOff = !isTrainingDay(today)
    const day = Math.min(done + 1, DAY_CARDS.length)
    const graduated = done >= DAY_CARDS.length
    const card = DAY_CARDS[day - 1]
    const nextCheckpoint = DAY_CARDS.find((c) => c.checkpoint && c.day >= day)
    const firstName = (user.fullName || 'Name').split(' ')[0]

    return {
        day,
        totalDays: DAY_CARDS.length,
        week: Math.ceil(day / 6),
        weekName: WEEK_NAMES[Math.ceil(day / 6) - 1],
        isDayOff,
        graduated,
        card: { ...card, fileName: `D${String(card.day).padStart(2, '0')}_${firstName}_${card.file}` },
        nextCard: DAY_CARDS[day] || null,
        nextCheckpoint: nextCheckpoint ? { day: nextCheckpoint.day, title: nextCheckpoint.title, inDays: nextCheckpoint.day - day } : null,
        usHours: day >= 19,
    }
}

module.exports = { DAY_CARDS, WEEK_NAMES, getProgress, isTrainingDay }
