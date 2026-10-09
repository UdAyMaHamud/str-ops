// ====== Status codes in plain English (workbook Day 13)
const STATUS_MEANING = {
    200: 'OK. The request worked.',
    201: 'Created. A new record was made.',
    400: 'Bad request. We sent something the tool did not understand.',
    401: 'Not allowed. The API key is wrong, expired or rotated.',
    404: 'Not found. The endpoint or record does not exist.',
    429: 'Too many requests. We are being rate limited, slow down and retry.',
    500: 'Server error. The other tool is having a problem.',
}

// ====== Normal vs worried for one integration (workbook Day 15)
const integrationHealth = (integration) => {
    const minutesSinceSync = Math.round((Date.now() - new Date(integration.lastSyncAt)) / 60000)
    const minutesSinceSuccess = Math.round((Date.now() - new Date(integration.lastSuccessAt)) / 60000)
    const isError = integration.lastStatus >= 400
    const isStale = minutesSinceSuccess > integration.staleAfterMin

    let level = 'good'
    let summary = 'Normal'
    if (isError && integration.lastStatus === 429 && !isStale) {
        level = 'warning'
        summary = 'Rate limited, retrying'
    } else if (isError || isStale) {
        level = 'critical'
        summary = isError ? `Failing with ${integration.lastStatus}` : 'No successful sync recently'
    }

    return {
        level,
        summary,
        minutesSinceSync,
        minutesSinceSuccess,
        statusMeaning: STATUS_MEANING[integration.lastStatus] || 'Unknown status code',
        normalRule:
            integration.mode === 'webhook'
                ? `Webhook. Worried if no successful event for ${integration.staleAfterMin} min or any 4xx/5xx.`
                : `Polls every ${integration.intervalMin} min. Worried if no success for ${integration.staleAfterMin} min or any 4xx/5xx.`,
    }
}

module.exports = { STATUS_MEANING, integrationHealth }
