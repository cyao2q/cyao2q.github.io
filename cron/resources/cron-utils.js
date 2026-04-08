/**
 * Cron 工具类（强制6字段：秒 分 时 日 月 周）
 * 支持星期英文：SUN MON TUE WED THU FRI SAT
 * 优化版：直接计算下一个匹配时间，避免逐秒遍历
 */
const CronUtil = (function () {
    const DAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const DAYS_CN = ['日', '一', '二', '三', '四', '五', '六'];
    const MAX_YEAR_AHEAD = 3;

    // ========== 1. 解析 ==========
    function parse(expr) {
        const parts = expr.trim().split(/\s+/);
        if (parts.length !== 6) {
            return {
                valid: false,
                fields: null,
                error: '必须是6位表达式：秒 分 时 日 月 周'
            };
        }

        const fields = {
            second: parts[0],
            minute: parts[1],
            hour: parts[2],
            day: parts[3],
            month: parts[4],
            dow: parts[5]
        };

        const rules = {
            second: {min: 0, max: 59, allowQ: false},
            minute: {min: 0, max: 59, allowQ: false},
            hour: {min: 0, max: 23, allowQ: false},
            day: {min: 1, max: 31, allowQ: true},
            month: {min: 1, max: 12, allowQ: false},
            dow: {min: 0, max: 6, allowQ: true}  // 0-6，0代表周日
        };

        for (const key of Object.keys(rules)) {
            const val = fields[key];
            const rule = rules[key];
            if (!validateField(val, rule.min, rule.max, rule.allowQ)) {
                return {
                    valid: false,
                    fields,
                    error: `${key === 'dow' ? '星期' : key} 字段格式错误`
                };
            }
        }

        // 检查日和周字段必须一个指定一个用? 否则语法冲突
        if ((fields.day === '?' && fields.dow === '?') || (fields.day !== '?' && fields.dow !== '?')) {
            return {
                valid: false,
                fields,
                error: '日和周字段必须一个指定一个用?'
            };
        }

        // 在验证成功后立即展开所有字段，避免重复计算
        const expandedFields = {
            second: expandField(fields.second, 0, 59),
            minute: expandField(fields.minute, 0, 59),
            hour: expandField(fields.hour, 0, 23),
            day: expandField(fields.day, 1, 31),
            month: expandField(fields.month, 1, 12),
            dow: expandField(fields.dow, 0, 6)
        };

        return {valid: true, fields, expandedFields, error: ''};
    }

    // ========== 2. 字段验证 ==========
    function validateField(value, min, max, allowQ) {
        if (value === '?') return allowQ;
        if (value === '*') return true;

        // 处理逗号分隔的多个值
        const parts = value.toUpperCase().split(',');
        for (const part of parts) {
            if (!validateSinglePart(part.trim(), min, max)) {
                return false;
            }
        }
        return true;
    }

    // ========== 2.5. 展开字段为有序数组（内部使用） ==========
    function expandField(pattern, min, max) {
        if (pattern === '*' || pattern === '?') {
            return Array.from({length: max - min + 1}, (_, i) => min + i);
        }

        const result = new Set();
        const parts = pattern.toUpperCase().split(',');

        for (const part of parts) {
            const trimmed = part.trim();

            if (trimmed.includes('/')) {
                // 步长
                const [range, step] = trimmed.split('/');
                const stepVal = parseInt(step);
                let start, end;

                if (range === '*') {
                    start = min;
                    end = max;
                } else if (/^\d+-\d+$/.test(range)) {
                    // 数字范围
                    [start, end] = range.split('-').map(Number);
                } else if (/^[A-Z]{3}-[A-Z]{3}$/.test(range)) {
                    // 英文星期范围
                    const [startDay, endDay] = range.split('-');
                    start = dowStrToNum(startDay);
                    end = dowStrToNum(endDay);
                } else {
                    start = parseInt(range);
                    end = max;
                }

                if (start !== null && end !== null) {
                    for (let i = start; i <= end; i += stepVal) {
                        if (i >= min && i <= max) result.add(i);
                    }
                }
            } else if (/^\d+-\d+$/.test(trimmed)) {
                // 数字范围
                const [start, end] = trimmed.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    if (i >= min && i <= max) result.add(i);
                }
            } else if (/^[A-Z]{3}-[A-Z]{3}$/.test(trimmed)) {
                // 英文星期范围：MON-FRI
                const [startDay, endDay] = trimmed.split('-');
                const start = dowStrToNum(startDay);
                const end = dowStrToNum(endDay);
                if (start !== null && end !== null) {
                    for (let i = start; i <= end; i++) {
                        result.add(i);
                    }
                }
            } else if (DAYS_EN.includes(trimmed)) {
                // 星期英文转数字
                const num = dowStrToNum(trimmed);
                if (num !== null) result.add(num);
            } else {
                // 单个数字
                const num = parseInt(trimmed);
                if (!isNaN(num) && num >= min && num <= max) {
                    result.add(num);
                }
            }
        }

        return Array.from(result).sort((a, b) => a - b);
    }

    // ========== 3. 单字段验证 ==========
    function validateSinglePart(part, min, max) {
        // 英文星期（单个）
        if (DAYS_EN.includes(part)) return true;

        // 英文星期范围：MON-FRI
        if (/^[A-Z]{3}-[A-Z]{3}$/.test(part)) {
            const [start, end] = part.split('-');
            const startIdx = DAYS_EN.indexOf(start);
            const endIdx = DAYS_EN.indexOf(end);
            return startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx;
        }

        // 步长：*/5 或 2-10/3 或 MON-FRI/2
        if (/^(\*|\d+|\d+-\d+|[A-Z]{3}-[A-Z]{3})\/\d+$/.test(part)) {
            const [range, stepStr] = part.split('/');
            const step = parseInt(stepStr);
            if (isNaN(step) || step <= 0) return false;
            if (range === '*') return true;
            if (range.includes('-')) {
                // 检查是数字范围还是英文星期范围
                if (/^\d+-\d+$/.test(range)) {
                    const [s, e] = range.split('-').map(Number);
                    return s >= min && e <= max && s <= e;
                } else if (/^[A-Z]{3}-[A-Z]{3}$/.test(range)) {
                    const [start, end] = range.split('-');
                    const startIdx = DAYS_EN.indexOf(start);
                    const endIdx = DAYS_EN.indexOf(end);
                    return startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx;
                }
                return false;
            }
            const num = parseInt(range);
            return !isNaN(num) && num >= min && num <= max;
        }

        // 数字范围：1-5
        if (/^\d+-\d+$/.test(part)) {
            const [s, e] = part.split('-').map(Number);
            return s >= min && e <= max && s <= e;
        }

        // 单个数字
        if (/^\d+$/.test(part)) {
            const num = parseInt(part);
            return num >= min && num <= max;
        }

        return false;
    }

    // ========== 4. 获取未来运行时间 ==========
    function getNextRunTimes(cronExpr, count = 5) {
        const res = parse(cronExpr);
        if (!res.valid) return [];

        const runs = [];
        let current = new Date();
        current.setMilliseconds(0);
        current.setSeconds(current.getSeconds() + 1); // 从下一秒开始

        const maxYear = current.getFullYear() + MAX_YEAR_AHEAD;

        while (runs.length < count && current.getFullYear() <= maxYear) {
            const next = findNextMatch(current, res.expandedFields, res.fields);
            
            if (!next) break;

            runs.push(formatDate(next));

            // 从匹配时间的下一秒继续查找
            current = new Date(next.getTime() + 1000);
        }

        return runs;
    }

    // ========== 5. 查找下一个匹配时间 ==========
    function findNextMatch(startDate, expandedFields, fields) {
        const date = new Date(startDate);
        const maxYear = date.getFullYear() + MAX_YEAR_AHEAD;

        // 直接使用已展开的字段，避免重复计算
        const seconds = expandedFields.second;
        const minutes = expandedFields.minute;
        const hours = expandedFields.hour;
        const daysOfMonth = expandedFields.day;
        const months = expandedFields.month;
        const daysOfWeek = expandedFields.dow;

        while (date.getFullYear() <= maxYear) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hour = date.getHours();
            const minute = date.getMinutes();
            const second = date.getSeconds();

            // 1. 检查月份
            const nextMonth = findNext(months, month);
            if (nextMonth === null) return null; // 超出范围

            if (nextMonth > month) {
                // 跳到目标月份的第一天
                date.setDate(1);
                date.setHours(0, 0, 0, 0);
                date.setMonth(nextMonth - 1);
                continue;
            }

            // 2. 检查日期（考虑月份天数限制）
            const maxDayInMonth = getDaysInMonth(year, month);
            const validDaysOfMonth = daysOfMonth.filter(d => d <= maxDayInMonth);

            if (validDaysOfMonth.length === 0) {
                // 当前月份没有有效日期，跳到下个月
                date.setDate(1);
                date.setHours(0, 0, 0, 0);
                date.setMonth(month);
                continue;
            }

            const currentDow = date.getDay();

            // 判断日期是否有效（标准 Cron 规则）
            let dayValid;
            const dayIsQ = fields.day === '?';
            const dowIsQ = fields.dow === '?';

            if (dayIsQ) {
                // 日字段是?，只检查星期匹配
                dayValid = daysOfWeek.includes(currentDow);
            } else if (dowIsQ) {
                // 周字段是?，只检查日期匹配
                dayValid = validDaysOfMonth.includes(day);
            }

            if (!dayValid) {
                // 找到下一个可能的日期
                let nextDay = null;

                // 尝试找下一个满足日-月的日期
                for (const d of validDaysOfMonth) {
                    if (d > day) {
                        nextDay = d;
                        break;
                    }
                }

                if (nextDay !== null) {
                    date.setDate(nextDay);
                    date.setHours(0, 0, 0, 0);
                } else {
                    // 本月没有更多日期，跳到下个月 先设置日期为1日再改月份 避免3月31日设为4月时因4月只有30天31日会溢出成5月1日
                    date.setDate(1);
                    date.setHours(0, 0, 0, 0);
                    date.setMonth(month);
                }
                continue;
            }

            // 3. 检查小时
            const nextHour = findNext(hours, hour);
            if (nextHour === null) {
                // 今天没有更多小时，跳到明天
                date.setDate(day + 1);
                date.setHours(0, 0, 0, 0);
                continue;
            }

            if (nextHour > hour) {
                date.setHours(nextHour, 0, 0, 0);
                continue;
            }

            // 4. 检查分钟
            const nextMinute = findNext(minutes, minute);
            if (nextMinute === null) {
                // 当前小时没有更多分钟，跳到下一小时
                date.setHours(hour + 1, 0, 0, 0);
                continue;
            }

            if (nextMinute > minute) {
                date.setMinutes(nextMinute, 0, 0);
                continue;
            }

            // 5. 检查秒
            const nextSecond = findNext(seconds, second);
            if (nextSecond === null) {
                // 当前分钟没有更多秒，跳到下一分钟
                date.setMinutes(minute + 1, 0, 0);
                continue;
            }

            if (nextSecond > second) {
                date.setSeconds(nextSecond, 0);
                return date;
            }

            // 如果秒也匹配（即当前时间正好是匹配点），检查是否满足星期的要求
            if (nextSecond === second) {
                // 检查当前时间是否满足星期的要求
                const currentDow = date.getDay();
                const dowIsQ = fields.dow === '?';
                const dowIsStar = fields.dow === '*';

                if (dowIsQ || dowIsStar) {
                    return date; // 星期字段是?或*，任意星期都匹配
                } else if (daysOfWeek.includes(currentDow)) {
                    return date; // 当前星期在要求的列表中
                } else {
                    // 星期不匹配，继续从下一秒开始搜索
                    date.setSeconds(second + 1);
                    continue;
                }
            }
        }

        return null;
    }

    // ========== 6. 星期英文转数字 ==========
    function dowStrToNum(s) {
        const idx = DAYS_EN.indexOf(s?.toUpperCase?.());
        return idx === -1 ? null : idx;
    }

    // ========== 8. 查找下一个匹配值 ==========
    function findNext(arr, target) {
        for (const val of arr) {
            if (val >= target) return val;
        }
        return null;
    }

    // ========== 9. 获取当月最大天数 ==========
    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    // ========== 10. 格式化日期 ==========
    function formatDate(date) {
        const pad = n => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
            + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} `
            + `周${DAYS_CN[date.getDay()]}`;
    }

    // ========== 对外暴露方法 ==========
    return {
        parse,
        getNextRunTimes
    };
})();

// 兼容浏览器和 Node.js
if (typeof window !== 'undefined') window.CronUtil = CronUtil;
if (typeof module !== 'undefined') module.exports = CronUtil;
