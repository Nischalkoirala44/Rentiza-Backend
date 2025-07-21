const express = require('express');
const connectDB = require('./src/config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const userRoutes = require('./src/routes/UserRoutes');
const authRoutes = require('./src/routes/AuthRoutes');
const roomRoutes = require('./src/routes/RoomRoutes');
const eSewaRoutes = require('./src/routes/eSewaRoutes');
const bookingRoutes = require('./src/routes/BookingRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

app.use('/', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/eSewa', eSewaRoutes);
app.use('/api/booking', bookingRoutes);

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectDB();
});
