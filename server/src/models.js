// Mongoose 数据模型（与微信云数据库集合一一对应）
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  openid: { type: String, unique: true, index: true },
  nickname: { type: String, default: '家庭成员' },
  avatarUrl: { type: String, default: '' },
  familyId: { type: String, default: '', index: true },
  role: { type: String, default: '' },
  tastes: { type: [String], default: [] },
  dislikes: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

const familySchema = new Schema({
  name: { type: String, default: '我的家' },
  inviteCode: { type: String, unique: true, index: true },
  ownerOpenid: String,
  memberOpenids: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

const recipeSchema = new Schema({
  name: { type: String, index: true },
  cuisine: { type: String, default: '家常' },
  ingredients: { type: [String], default: [] },
  steps: { type: [String], default: [] },
  tasteTags: { type: [String], default: [] },
  seasonTags: { type: [String], default: ['四季'] },
  nutritionTags: { type: [String], default: [] },
  cookTime: { type: Number, default: 0 },
  difficulty: { type: String, default: '易' },
  source: { type: String, default: 'user' }, // seed | ai | user
  familyId: { type: String, default: '' },   // 空 = 公共库
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
});

const menuItemSchema = new Schema({
  recipeId: String,
  name: String,
  addedBy: String,
  votedBy: { type: [String], default: [] }
}, { _id: false });

const dailyMenuSchema = new Schema({
  familyId: { type: String, index: true },
  date: String,
  meal: String, // 早 | 中 | 晚
  items: { type: [menuItemSchema], default: [] },
  status: { type: String, default: '投票中' }, // 投票中 | 已定
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
});

const mealRecordSchema = new Schema({
  familyId: { type: String, index: true },
  date: String,
  meal: String,
  recipeIds: { type: [String], default: [] },
  nutritionTags: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

const seasonalSchema = new Schema({
  month: { type: Number, index: true },
  solarTerm: String,
  region: { type: String, default: '通用' },
  ingredients: { type: [String], default: [] },
  note: String
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Family: mongoose.model('Family', familySchema),
  Recipe: mongoose.model('Recipe', recipeSchema),
  DailyMenu: mongoose.model('DailyMenu', dailyMenuSchema),
  MealRecord: mongoose.model('MealRecord', mealRecordSchema),
  SeasonalIngredient: mongoose.model('SeasonalIngredient', seasonalSchema)
};
