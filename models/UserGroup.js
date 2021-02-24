"use strict";

const Base = require('./Base')

/**
 * Класс текущего пользователя
 * @constructor
 */
function UserGroup (data) {
    let self = this
    
    // Вызываем конструктор базовой модели
    Base.call(this)
    
    data = data || {}
    
    // Устанавливаем атрибуты модели, встроенные и переданные
    self.set(Object.assign({
        apiPath: '/usergroup',
        id: null,
        createdAt: null,
        updatedAt: null,
        language: 'ru',
        options: {},
        name: ''
    }, data))
    
    return self
}

// Наследуемся от базовой модели
UserGroup.prototype = Object.create(Base.prototype)
UserGroup.prototype.constructor = UserGroup

console.log('🔸️  UserGroup model initiated')

module.exports = UserGroup;
