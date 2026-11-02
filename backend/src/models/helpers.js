// Attribute helpers shared by models.

/** TIME column exposed as "HH:mm" and accepting "HH:mm" or "HH:mm:ss". */
function timeAttribute(DataTypes, field, { allowNull = false, defaultValue } = {}) {
  return {
    type: DataTypes.TIME,
    allowNull,
    defaultValue,
    get() {
      const raw = this.getDataValue(field);
      return raw ? String(raw).slice(0, 5) : raw;
    },
    set(value) {
      if (value === null || value === undefined || value === '') {
        this.setDataValue(field, null);
        return;
      }
      const v = String(value);
      this.setDataValue(field, v.length === 5 ? `${v}:00` : v);
    },
  };
}

/** JSON column that tolerates drivers returning a string. */
function jsonAttribute(DataTypes, field, { allowNull = true, defaultValue } = {}) {
  return {
    type: DataTypes.JSON,
    allowNull,
    defaultValue,
    get() {
      const raw = this.getDataValue(field);
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return raw;
    },
  };
}

module.exports = { timeAttribute, jsonAttribute };
