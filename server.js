const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// 跨域+JSON解析
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// 解析JSON请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 创建空的用户JSON文件
app.post('/createEmptyFile', (req, res) => {
    const { fileName } = req.body;
    const filePath = path.join(__dirname, 'public', fileName);
    // 写入空数组
    fs.writeFile(filePath, JSON.stringify([]), (err) => {
        if (err) {
            console.error('创建空文件失败：', err);
            res.status(500).json({ success: false, msg: '创建文件失败' });
        } else {
            res.json({ success: true, msg: '空文件创建成功' });
        }
    });
});

// 保存用户专属JSON文件
app.post('/saveUserFile', (req, res) => {
    const { fileName, data } = req.body;
    const filePath = path.join(__dirname, 'public', fileName);
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('保存用户文件失败：', err);
            res.status(500).json({ success: false, msg: '保存失败' });
        } else {
            res.json({ success: true, msg: '保存成功' });
        }
    });
});

// 静态文件服务
app.use(express.static('public'));

// 保存数据接口
app.post('/save-data', (req, res) => {
    try {
        const data = JSON.stringify(req.body, null, 2);
        const filePath = path.join(__dirname, 'public', 'releasePlanData.json');
        
        // 确保目录存在
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }

        // 写入文件
        fs.writeFileSync(filePath, data, 'utf8');
        res.json({ success: true, msg: '数据保存成功' });
    } catch (err) {
        console.error('保存失败：', err);
        res.json({ success: false, msg: err.message });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log('访问地址：http://localhost:3000');
});