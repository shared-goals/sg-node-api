"use strict";

const Base = require('./Base')

/**
 * Класс текущего линка пользователя, партнера и адреса
 * @constructor
 */
function Link (data) {
    let self = this
    
    // Вызываем конструктор базовой модели
    Base.call(this)
    
    data = data || {}
    
    // Устанавливаем атрибуты модели, встроенные и переданные
    self.set(Object.assign({
        apiPath: '/links',
        id: null,
        createdAt: null,
        updatedAt: null,
        user: null,
        address: '',
        partner: null
    }, data))
    
    return self
}

// Наследуемся от базовой модели
Link.prototype = Object.create(Base.prototype)
Link.prototype.constructor = Link

console.log('🔸️  Link model initiated')

module.exports = Link;
