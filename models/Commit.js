"use strict";

const Base = require('./Base')
const req = require('../utils/req')
const moment = require('moment')
const errors = require('../errors')

/**
 * Класс коммита к контракту
 * @constructor
 */
function Commit (data) {
    let self = this
    
    // Вызываем конструктор базовой модели
    Base.call(this)

    data = data || {}
    
    /**
     * Регулярка разбора короткой команды: /commit [<owner>/]<key> <duration> "<whats_done>"[ "<whats_next>"]
     * Пример: /commit ewgeniyk/sg 1h 20min "Some fixes" "Finish /commit"
     * @type {RegExp}
     */
    self.re = /((?<owner>[^/\s]+)\/)?(?<key>[^\s]+)\s+((?<hours>\d+)\s*(h|hr)\s+)?((?<minutes>\d+)\s*(m|min)\s+)?("(?<whats_done>[^"]+)")\s*("(?<whats_next>[^"]+)")?$/
    
    /**
     * Регулярка разбора короткой команды: /commit [<owner>/]<key> <duration> "<whats_done>"[ "<whats_next>"]
     * Пример: /commit ewgeniyk/sg 1h 20min "Some fixes" "Finish /commit"
     * @type {RegExp}
     */
    self.dur_re = /^\s*((?<hours>\d+)\s*(h|hr)\s*)?((?<minutes>\d+)\s*(m|min))?\s*$/
    

    /**
     * Возвращает сериализованный объект, с учетом под-объектов
     *
     * @returns {string}
     */
    self.plain = () => {
        const data = JSON.parse(self.toJSON())
        data.contract = JSON.parse(data.contract)
        return data
    }
    
    /**
     * Возвращает объект строки длительности или нулл, если строка не проходит валидацию по регулярке
     *
     * @returns {{}|null}
     */
    self.validateDuration = (text) => {
        const duration = text.match(self.dur_re)
        return duration ? duration.groups : null
    }
    
    /**
     * Возвращает форматированную строку длительности
     *
     * @returns {string}
     */
    self.formatDuration = () => {
        const duration = self.get('duration')
        return duration ? (duration >= 60
            ? Math.floor(duration / 60) + 'h' + (duration % 60 !== 0 ? ' ' + (duration % 60) + 'min' : '')
            : duration + 'min') : ''
    }
    
    /**
     * Возвращает текущие коммиты заданного пользователя
     *
     * @param ctx - Контекст приложения
     * @param user_id - Идентификатор пользователя
     * @returns {Promise.<TResult|null>}
     */
    self.findByUser = async(ctx, user_id) => {
        const ret = await req.make(ctx, '/users/' + user_id + '/commits', {
            method: 'GET'
        }).then( response => {
            let commits = response.map( commit => (new Commit()).set(commit))
            commits = self.sortItems(commits, 'createdAt', 'desc')
            return self.formatFields(commits)
        }).catch( reason => {
            console.error(reason)
            return false
        })
    
        return ret || null
    }
    
    /**
     * Возвращает массив коммитов заданной цели
     *
     * @param ctx - Контекст приложения
     * @param id - Идентификатор заданной цели
     * @returns {Promise.<TResult|null>}
     */
    self.findByGoal = async(ctx, id) => {
        const ret = await req.make(ctx, '/goals/' + id + '/commits', {
            method: 'GET',
        }).then( response => {
            let commits = response.map( commit => (new Commit()).set(commit))
            commits = self.sortItems(commits, 'createdAt', 'desc')
            return self.formatFields(commits)
        }).catch( reason => {
            console.error(reason)
            return false
        })
    
        return ret || null
    }
    
    /**
     * Форматирует поля массива коммитов
     *
     * @param commits - Массив коммитов
     * @returns {any[] | Array}
     */
    self.formatFields = (commits) => {
        return (commits || []).map( commit => {
            commit.set({
                createdAt_human: moment(commit.get('createdAt')).fromNow(), // format('DD.MM.YYYY HH:mm'),
                duration_human: commit.formatDuration('duration')
            })
            return commit
        })
    }
    
    /**
     * Обновляет флаг полноты записи / готовности к ее записи в БД
     */
    self.updateReadyState = () => {
        self.set({
            ready: self.get('duration') && self.get('duration') !== 0 && self.get('duration') !== ''
                && self.get('whats_done') !== ''
        })
    }
    
    /**
     * Сохраняет объект в БД. Апдейтит существующую запись или вставляет новую в зависимости от поля self.id
     *
     * @param ctx - Контекст приложения
     * @returns {Promise.<Goal>}
     */
    self._save = self.save ; self.save = async(ctx) => {
        // Фиксируем текущую дату срабатывания в контракте и вычисляем следующую дату по контракту, сэйвим в контракт
        // const contract = self.get('contract')
        // contract.save(ctx)
        
        
        // Сохраняем в переменную текущее поле контракта
        const contractObject = self.get('contract')
        
        // Переопределяем поле контракта, чтобы была json-структура с полем id, а не объект модели Contract
        self.set({ contract: self.plain().contract })
        
        // Вызываем дефолтный save()-метод, ничего не знающий о внутренних под-структурах
        await self._save(ctx)
        
        // И возвращаем на место контракт как объект
        self.set({ contract: contractObject })
        
        return self
    }
    
    // Устанавливаем атрибуты модели, встроенные и переданные
    self.set(Object.assign({
        apiPath: '/commits',
        owner: null,
        contract: null,
        duration: 0,
        whats_next: null,
        whats_done: null,
        createdAt: null,
        updatedAt: null
    }, data))
    
    return self
}

// Наследуемся от базовой модели
Commit.prototype = Object.create(Base.prototype)
Commit.prototype.constructor = Commit

console.log('🔸️  Commit model initiated')

module.exports = Commit;
