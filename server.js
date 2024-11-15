const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./dbconnect');
const excelRoutes = require('./src/Routes/MasterExcelRoutes/MasterExcelRoUtes');
const BatchExcelRoutes = require('./src/Routes/BatchExcelRoutes/BatchExcelroutes');
const CustomerOrdereExcelRoutes = require('./src/Routes/OrderRoutes/CustomerOrderRoutes');
const ArticleRoutes=require('./src/Routes/ArticleRoutes/ArticleRoutes');
const QutationRoutes=require('./src/Routes/QutationRoutes/QutationRoute')
const AuthRoutes=require('./src/Routes/AuthRoutes/AuthRoutes')
const app = express();

connectDB();

app.use(cors());
app.use(bodyParser.json());
app.use('/api/excel',ArticleRoutes)
app.use('/api/excel', excelRoutes);
app.use('/api/excel', BatchExcelRoutes );
app.use('/api/excel',CustomerOrdereExcelRoutes);
app.use('/api/excel',QutationRoutes)
app.use('/api/auth',AuthRoutes)
app.get('/', (req, res) => {
    res.send('Backend is running - Teajpaul');
  });
  
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
