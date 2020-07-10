"use strict";

const Base = require('./base')
const req = require('../utils/req')

/**
 * Класс контракта к цели
 * @constructor
 */
function Contract (data) {
    let self = this
    
    // Вызываем конструктор базовой модели
    Base.call(this)

    data = data || {}
    
    /**
     * Массив дней недели в полном написании латиницей
     * @type {[string,string,string,string,string,string,string]}
     */
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    /**
     * Массив дней недели латиницей, укороченный до трех символов
     * @type {Array}
     */
    const shortWeekdays = weekdays.map((item) => item.substr(0, 3))
    
    /**
     * Массив различных вариаций задания минут латиницей
     * @type {Array}
     */
    const minsVariants = ('m|min|mins|minutes').split('|')
    
    /**
     * Массив различных вариаций задания часов латиницей
     * @type {Array}
     */
    const hoursVariants = ('h|hour|hours').split('|')
    
    /**
     * Регулярка разбора формата задания параметров контракта: <duration_value><duration_measures> [every ]<repeats>
     * Примеры: 2h every mon,tue
     *          100m 5, 10, 15
     *          3hour every 10
     *          30min Monday, Tuesday, Saturday
     * @type {RegExp}
     */
    self.re = new RegExp('^(?<duration_value>\\d+)\\s*(?<duration_measures>'
        + minsVariants.join('|') + '|' + hoursVariants.join('|')
        + ')\\s+(every\\s)?(?<repeats>('
        + 'day|week|month'
        + '|' + weekdays.join('|')
        + '|' + shortWeekdays.join('|')
        + '|\\d+|\\d+,\\d+|,|\\s){1,13})$', 'i')

    
    /**
     * Проверяет валидность введенной строки занятости:
     * XXm|h every (day|mon|tue|...|week|month|XX,XX)
     * Примеры:
     *   10m every day
     *   3h every sat,sun
     *   10h every week
     *
     * @param ctx
     * @param txt
     * @return {{}}
     */
    self.validateFormat = (ctx, txt) => {
        let ret
        // ret = await req.make(ctx, 'contracts/validate/' + encodeURIComponent(txt), {
        //     method: 'GET',
        // }).then( (response) => response.data)

        let data = self.re.exec(txt)
        
        if (data !== null) {
            ret = self.parseText(data.hasOwnProperty('groups') ? data.groups : {
                duration_value: data[1],
                duration_measures: data[2],
                repeats: data[4]
            })
        } else {
            ret = null
        }
        return ret
    }
    
    /**
     * Парсит исходный формат занятости и возвращает форматированный для хранения в БД
     *
     * @param data введенный формат занятости. Пример: {duration_value: 20, duration_measures: 'min', repeats: 'mon,sat}
     * @returns {{}}
     */
    self.parseText = (data) => {
        let ret = {
            duration: null,
            week_days: [],
            month_days: []
        }
        
        if (minsVariants.indexOf(data.duration_measures) !== -1) {
            ret.duration = data.duration_value
        } else if (hoursVariants.indexOf(data.duration_measures) !== -1) {
            ret.duration = data.duration_value * 60
        }
        
        let days = data.repeats.replace(/\s/, '').replace(/[;|]/, ',').toLowerCase().split(',')
        
        days.forEach((day) => {
            if (day === 'day') {
                ret.week_days = shortWeekdays
            } else if(day.match(/^\d+$/)) {
                ret.month_days.push(parseInt(day, 10))
            } else {
                let idx = weekdays.indexOf(day) !== -1
                    ? weekdays.indexOf(day)
                    : (shortWeekdays.indexOf(day) !== -1
                        ? shortWeekdays.indexOf(day)
                        : null
                    )
                if (idx !== null) {
                    ret.week_days.push(shortWeekdays[idx])
                }
            }
        })
        return ret
    }
    
    /**
     * Возвращает форматированную строку длительности
     *
     * @returns {string}
     */
    self.formatDuration = () => {
        const duration = self.get('duration')
        return duration ? (duration >= 60 ? (duration / 60) + 'h' : duration + 'min') : ''
    }
    
    /**
     * Возвращает строку параметров занятости по объекту их данных
     *
     * @returns {string}
     */
    self.toString = () => {
        const duration = self.get('duration')
        const week_days = self.get('week_days')
        const month_days = self.get('month_days')
        return duration && (week_days || month_days) ?
            (self.formatDuration()
                + ' every ' + (week_days.length > 0 ? (week_days.length === 7 ? 'day' : week_days.join(',')) : month_days.join(','))) : null
    }
    
    /**
     * Возвращает массив контрактов указанного или текущего пользователя
     *
     * @param ctx - Контекст приложения
     * @param user_id - ID указанного пользователя
     * @returns {Promise.<TResult|null>}
     */
    self.findByUser = async (ctx, user_id) => {
        const ret = await req.make(ctx, '/users/' + (user_id || ctx.session.user.get('id')) + '/contracts', {
            method: 'GET'
        }).then( response => {
            return response.map((contract) => (new Contract()).set(contract))
        }).catch( reason => {
            console.error(reason)
            return false
        })
    
        return ret || null
    }
    
    /**
     * Возвращает массив контрактов заданной цели
     *
     * @param ctx - Контекст приложения
     * @param id - Идентификатор заданной цели
     * @returns {Promise.<TResult|null>}
     */
    self.findByGoal = async (ctx, id) => {
        const ret = await req.make(ctx, '/goals/' + id + '/contracts', {
            method: 'GET',
        }).then( response => {
            return response.map((contract) => (new Contract()).set(contract))
        }).catch( reason => {
            console.error(reason)
            return false
        })
    
        return ret || null
    }
    
    /**
     * Возвращает контракт заданного пользователя к заданной цели
     *
     * @param ctx - Контекст приложения
     * @param goal - Идентификатор заданной цели
     * @param owner - Идентификатор заданного пользователя
     * @returns {Promise.<TResult>}
     */
    self.findByGoalAndOwner = async(ctx, goal, owner) => {
        return await req.make(ctx, '/contracts/' + goal + '/' + owner, {
            method: 'GET',
        }).then( response => {
            if (!response.error) {
                return self.set(response)
            } else {
                return null
            }
        }).catch( reason => {
            console.error(reason)
            return false
        })
    }
    
    /**
     * Обновляет флаг полноты записи / готовности к ее записи в БД
     *
     * @param ctx - Контекст приложения
     */
    self.updateReadyState = async(ctx) => {
        self.set({ready: (await self.validateFormat(ctx, self.get('occupation'))) !== null})
    }
    
    /**
     * Сохраняет объект в БД. Апдейтит существующую запись или вставляет новую в зависимости от поля self.id
     *
     * @param ctx - Контекст приложения
     * @returns {Promise.<Goal>}
     */
    self.save = async(ctx) => {
        // Определяем данные для вставки или апдейта
        const data = self.get()
        data.owner = { id: ctx.session.user.get('id')}
        
        if (self.get('id') !== null && typeof self.get('id') !== 'undefined') {
            // Если был определен айдишник - это апдейт, используем метод PUT
            await req.make(ctx, '/contracts/' + self.get('id'), Object.assign({}, self.get(), {
                method: 'PUT',
            })).then( response => {
                self.set(response)
            }).catch( reason => {
                console.error(reason)
                return false
            })
        } else {
            // Если не был определен айдишник - это вставка, используем метод POST
            await req.make(ctx, '/contracts', Object.assign({}, self.get(), {
                method: 'POST',
            })).then( response => {
                self.set(response)
            }).catch( reason => {
                console.error(reason)
                return false
            })
        }
        
        return self
    }
    
    // Устанавливаем атрибуты модели, встроенные и переданные
    self.set(Object.assign({
        apiPath: '/contracts',
        owner: null,
        goal: null,
        key: '',
        duration: 0,
        occupation: null,
        week_days: [],
        month_days: [],
        next_run: null,
        last_run: null,
        createdAt: null,
        updatedAt: null,
        ready: false
    }, data))
    
    return self
}

// Наследуемся от базовой модели
Contract.prototype = Object.create(Base.prototype)
Contract.prototype.constructor = Base

console.log('🔸️  Contract model initiated')

module.exports = Contract;