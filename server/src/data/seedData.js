// 种子菜谱库 + 时令食材表（与 cloudfunctions/recipes/seedData.js 保持一致）
const RECIPES = [
  { name: '番茄炒蛋', cuisine: '家常', cookTime: 15, difficulty: '易', ingredients: ['番茄2个', '鸡蛋3个', '葱花', '盐', '糖少许'], steps: ['鸡蛋打散炒熟盛出', '番茄切块下锅炒出汁', '加盐糖调味', '倒入鸡蛋翻炒撒葱花'], tasteTags: ['咸鲜', '微甜'], seasonTags: ['四季'], nutritionTags: ['蛋白质', '蔬菜'] },
  { name: '青椒土豆丝', cuisine: '家常', cookTime: 15, difficulty: '易', ingredients: ['土豆2个', '青椒1个', '蒜', '醋', '盐'], steps: ['土豆青椒切丝，土豆丝泡水', '热油爆蒜', '下土豆丝快炒', '加青椒、醋、盐炒熟'], tasteTags: ['酸辣', '清爽'], seasonTags: ['四季'], nutritionTags: ['蔬菜', '主食类'] },
  { name: '红烧肉', cuisine: '家常', cookTime: 60, difficulty: '中', ingredients: ['五花肉500g', '冰糖', '生抽', '老抽', '姜', '料酒'], steps: ['五花肉焯水切块', '炒糖色', '下肉翻炒上色', '加调料和水小火炖40分钟收汁'], tasteTags: ['咸甜', '浓郁'], seasonTags: ['秋', '冬'], nutritionTags: ['蛋白质', '红肉', '高脂'] },
  { name: '清蒸鲈鱼', cuisine: '粤', cookTime: 25, difficulty: '中', ingredients: ['鲈鱼1条', '姜丝', '葱丝', '蒸鱼豉油', '料酒'], steps: ['鱼身改刀铺姜丝', '大火蒸8分钟', '倒掉汤汁铺葱丝', '淋热油和豉油'], tasteTags: ['咸鲜', '清淡'], seasonTags: ['四季'], nutritionTags: ['蛋白质', '白肉', '低脂'] },
  { name: '蒜蓉西兰花', cuisine: '家常', cookTime: 12, difficulty: '易', ingredients: ['西兰花1颗', '蒜', '盐', '蚝油'], steps: ['西兰花焯水', '爆香蒜末', '下西兰花快炒', '加盐蚝油调味'], tasteTags: ['咸鲜', '清淡'], seasonTags: ['四季'], nutritionTags: ['蔬菜', '低脂'] },
  { name: '麻婆豆腐', cuisine: '川', cookTime: 20, difficulty: '中', ingredients: ['嫩豆腐1盒', '肉末', '豆瓣酱', '花椒', '蒜苗'], steps: ['豆腐切块焯水', '炒肉末加豆瓣酱', '加水下豆腐烧入味', '勾芡撒花椒粉蒜苗'], tasteTags: ['麻辣', '浓郁'], seasonTags: ['四季'], nutritionTags: ['蛋白质', '豆制品'] },
  { name: '紫菜蛋花汤', cuisine: '家常', cookTime: 10, difficulty: '易', ingredients: ['紫菜', '鸡蛋1个', '虾皮', '葱花', '盐'], steps: ['水烧开下紫菜虾皮', '淋入蛋液', '加盐撒葱花'], tasteTags: ['咸鲜', '清淡'], seasonTags: ['四季'], nutritionTags: ['蛋白质', '汤品'] },
  { name: '宫保鸡丁', cuisine: '川', cookTime: 25, difficulty: '中', ingredients: ['鸡胸肉', '花生米', '干辣椒', '葱', '糖醋汁'], steps: ['鸡丁腌制', '炸花生米', '爆干辣椒下鸡丁', '加糖醋汁和花生翻炒'], tasteTags: ['酸甜', '微辣'], seasonTags: ['四季'], nutritionTags: ['蛋白质', '白肉'] },
  { name: '凉拌黄瓜', cuisine: '家常', cookTime: 8, difficulty: '易', ingredients: ['黄瓜2根', '蒜', '醋', '香油', '盐'], steps: ['黄瓜拍碎切段', '加蒜末调料', '拌匀腌5分钟'], tasteTags: ['酸辣', '清爽'], seasonTags: ['夏'], nutritionTags: ['蔬菜', '低脂'] },
  { name: '冬瓜排骨汤', cuisine: '家常', cookTime: 50, difficulty: '易', ingredients: ['排骨400g', '冬瓜', '姜', '盐'], steps: ['排骨焯水', '加姜炖30分钟', '下冬瓜再炖15分钟', '加盐调味'], tasteTags: ['咸鲜', '清淡'], seasonTags: ['夏'], nutritionTags: ['蛋白质', '汤品', '蔬菜'] },
  { name: '地三鲜', cuisine: '东北', cookTime: 25, difficulty: '中', ingredients: ['茄子', '土豆', '青椒', '蒜', '生抽'], steps: ['三样过油', '爆蒜', '下料翻炒', '加生抽勾薄芡'], tasteTags: ['咸鲜', '浓郁'], seasonTags: ['夏', '秋'], nutritionTags: ['蔬菜'] },
  { name: '白灼菜心', cuisine: '粤', cookTime: 10, difficulty: '易', ingredients: ['菜心', '蒜油', '生抽'], steps: ['菜心焯水', '摆盘', '淋蒜油生抽'], tasteTags: ['清淡', '咸鲜'], seasonTags: ['冬', '春'], nutritionTags: ['蔬菜', '低脂'] },
  { name: '可乐鸡翅', cuisine: '家常', cookTime: 30, difficulty: '易', ingredients: ['鸡翅中8个', '可乐1罐', '生抽', '姜'], steps: ['鸡翅划口煎香', '倒入可乐生抽', '中火收汁'], tasteTags: ['咸甜'], seasonTags: ['四季'], nutritionTags: ['蛋白质', '白肉'] },
  { name: '酸辣土豆汤', cuisine: '家常', cookTime: 20, difficulty: '易', ingredients: ['土豆', '番茄', '醋', '白胡椒', '香菜'], steps: ['土豆切丝', '番茄炒出汁加水', '下土豆丝煮软', '加醋胡椒调味'], tasteTags: ['酸辣'], seasonTags: ['秋', '冬'], nutritionTags: ['汤品', '蔬菜'] },
  { name: '清炒时蔬', cuisine: '家常', cookTime: 10, difficulty: '易', ingredients: ['当季绿叶菜', '蒜', '盐'], steps: ['爆蒜', '下菜大火快炒', '加盐出锅'], tasteTags: ['清淡'], seasonTags: ['四季'], nutritionTags: ['蔬菜', '低脂'] },
  { name: '糖醋里脊', cuisine: '家常', cookTime: 35, difficulty: '中', ingredients: ['里脊肉', '番茄酱', '白醋', '糖', '淀粉'], steps: ['里脊裹粉炸酥', '调糖醋汁', '下肉裹汁'], tasteTags: ['酸甜'], seasonTags: ['四季'], nutritionTags: ['蛋白质', '高脂'] },
  { name: '蒜苗炒腊肉', cuisine: '湘', cookTime: 20, difficulty: '中', ingredients: ['腊肉', '蒜苗', '干辣椒'], steps: ['腊肉蒸软切片', '煸出油', '下蒜苗辣椒炒香'], tasteTags: ['咸香', '微辣'], seasonTags: ['冬'], nutritionTags: ['蛋白质', '红肉', '高脂'] },
  { name: '皮蛋瘦肉粥', cuisine: '粤', cookTime: 60, difficulty: '易', ingredients: ['大米', '皮蛋', '瘦肉', '姜丝', '葱花'], steps: ['米煮成粥', '下瘦肉皮蛋', '煮至绵软撒葱花'], tasteTags: ['咸鲜', '清淡'], seasonTags: ['四季'], nutritionTags: ['主食类', '蛋白质'] },
  { name: '韭菜炒鸡蛋', cuisine: '家常', cookTime: 12, difficulty: '易', ingredients: ['韭菜1把', '鸡蛋3个', '盐'], steps: ['鸡蛋炒散盛出', '炒韭菜', '回锅合炒加盐'], tasteTags: ['咸鲜'], seasonTags: ['春'], nutritionTags: ['蛋白质', '蔬菜'] },
  { name: '萝卜炖牛腩', cuisine: '家常', cookTime: 90, difficulty: '中', ingredients: ['牛腩', '白萝卜', '姜', '八角', '生抽'], steps: ['牛腩焯水', '炒香加水炖1小时', '下萝卜再炖20分钟'], tasteTags: ['咸鲜', '浓郁'], seasonTags: ['冬'], nutritionTags: ['蛋白质', '红肉', '蔬菜'] }
];

const SEASONAL = [
  { month: 1, solarTerm: '小寒/大寒', region: '通用', ingredients: ['白萝卜', '大白菜', '冬笋', '羊肉', '山药'], note: '寒冬进补，宜温热炖煮' },
  { month: 2, solarTerm: '立春/雨水', region: '通用', ingredients: ['韭菜', '春笋', '菠菜', '荠菜', '豆苗'], note: '初春升发，宜清淡疏肝' },
  { month: 3, solarTerm: '惊蛰/春分', region: '通用', ingredients: ['春笋', '香椿', '菠菜', '草莓', '蒜苗'], note: '万物生发，多吃时令鲜蔬' },
  { month: 4, solarTerm: '清明/谷雨', region: '通用', ingredients: ['莴笋', '豌豆', '蚕豆', '芦笋', '香椿'], note: '春末，鲜豆类上市' },
  { month: 5, solarTerm: '立夏/小满', region: '通用', ingredients: ['黄瓜', '茭白', '苦瓜', '樱桃', '蒜薹'], note: '入夏清热，宜清爽' },
  { month: 6, solarTerm: '芒种/夏至', region: '通用', ingredients: ['冬瓜', '丝瓜', '茄子', '西红柿', '荔枝'], note: '盛夏祛湿，多瓜类' },
  { month: 7, solarTerm: '小暑/大暑', region: '通用', ingredients: ['苦瓜', '冬瓜', '绿豆', '莲藕', '西瓜'], note: '酷暑消暑，宜清淡' },
  { month: 8, solarTerm: '立秋/处暑', region: '通用', ingredients: ['莲藕', '毛豆', '丝瓜', '葡萄', '玉米'], note: '初秋润燥' },
  { month: 9, solarTerm: '白露/秋分', region: '通用', ingredients: ['南瓜', '菱角', '芋头', '梨', '螃蟹'], note: '秋季滋阴润肺' },
  { month: 10, solarTerm: '寒露/霜降', region: '通用', ingredients: ['白萝卜', '山药', '板栗', '柿子', '花菜'], note: '深秋进补' },
  { month: 11, solarTerm: '立冬/小雪', region: '通用', ingredients: ['大白菜', '萝卜', '红薯', '羊肉', '橙子'], note: '初冬温补' },
  { month: 12, solarTerm: '大雪/冬至', region: '通用', ingredients: ['白菜', '冬笋', '羊肉', '牛肉', '柚子'], note: '寒冬大补，宜炖汤' }
];

module.exports = { RECIPES, SEASONAL };
