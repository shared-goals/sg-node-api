"use strict";

const Base = require('./Base')
const req = require('../utils/req')
const errors = require('../errors')

/**
 * Класс текущего партнера
 * @constructor
 */
function Partner (data) {
    let self = this
    
    // Вызываем конструктор базовой модели
    Base.call(this)
    
    data = data || {}
    
    /**
     * Обновляет объект юзера в сессии по данным из БД
     *
     * @returns {Promise.<*>}
     */
    self.refresh = async(ctx) => {
        return self.findById(ctx, self.get('id'))
    }

    // Устанавливаем атрибуты модели, встроенные и переданные
    self.set(Object.assign({
        apiPath: '/partners',
        id: null,
        createdAt: null,
        updatedAt: null,
        language: 'ru',
        username: '',
        email: '',
        password: '',
        auth: {},
        options: {},
        name: '',
        telegram_id: null
    }, data))
    
    return self
}

// Наследуемся от базовой модели
Partner.prototype = Object.create(Base.prototype)
Partner.prototype.constructor = Partner

console.log('🔸️  Partner model initiated')

module.exports = Partner;
