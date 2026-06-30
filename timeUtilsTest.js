const { toZonedTime, formatInTimeZone } = require('date-fns-tz');
const { differenceInMinutes, addMinutes, isWeekend } = require('date-fns');

function calculateTimeSegments(inicioStr, terminoStr) {
    const TIMEZONE = 'America/Tijuana';
    
    // Parse UTC strings to Date objects
    let startUTC = new Date(inicioStr);
    let endUTC = terminoStr ? new Date(terminoStr) : new Date();

    if (startUTC >= endUTC) {
        return { minutos_habiles: 0, minutos_extra: 0 };
    }

    let minutos_habiles = 0;
    let minutos_extra = 0;

    // Simulate minute by minute for accuracy (or just simple logic)
    // Since periods can be multiple days, minute-by-minute might be slow if it's months,
    // but for 1-2 days it's fine. For a robust approach, we calculate overlap.
    
    // Convert to zoned time objects
    let current = toZonedTime(startUTC, TIMEZONE);
    let end = toZonedTime(endUTC, TIMEZONE);

    // Minute by minute approach
    while (current < end) {
        const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
        const hour = current.getHours();
        const minute = current.getMinutes();
        
        // 9:00 to 16:30 (4:30 PM) is:
        // hour >= 9 and (hour < 16 or (hour === 16 && minute < 30))
        const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
        const isWorkingHour = hour >= 9 && (hour < 16 || (hour === 16 && minute < 30));

        if (isWeekday && isWorkingHour) {
            minutos_habiles++;
        } else {
            minutos_extra++;
        }

        current = addMinutes(current, 1);
    }

    return { minutos_habiles, minutos_extra };
}

console.log(calculateTimeSegments(new Date('2023-10-25T15:00:00Z').toISOString(), new Date('2023-10-25T17:00:00Z').toISOString()));
