const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRouter = require('./routes/auth.router');
const excelRouter = require('./routes/excel.router');

const app = express();

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('Connection Failed', err));

app.use('/api/users', authRouter);
app.use('/api/excel', excelRouter);

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});