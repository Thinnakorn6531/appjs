var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var mysql = require('mysql');

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

//================Middleware================//
app.use(bodyParser.json());


//================connectdb=================//
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sunproject'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});
//=========ข้อมูลผู้ใช้================//
const users = [
  { username: 'student', email: 'student@example.com', password: '123', role: 'student' },
  { username: 'staff', email: 'staff@example.com', password: '456', role: 'staff' },
  { username: 'lecture', email: 'lecture@example.com', password: '789', role: 'lecture' }
];

// Loop through the array of users and insert each one into the users table
users.forEach(user => {
  connection.query('INSERT INTO users SET ?', user, (err, result) => {
    if (err) throw err;
    console.log('User added successfully');
  });
});



//============== view engine setup ==================//
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


//===========Route============//
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});
//-----------------------------------------------------------------------//
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});
//-----------------------------------------------------------------------//
app.get('/student_booking.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student_booking.html'));
});
//-----------------------------------------------------------------------//
app.get('/student_history.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student_history.html'));
});
//-----------------------------------------------------------------------//
app.get('/student_status.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student_status.html'));
});

//=============API===============//
//============register===============//
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  console.log('Username:', username);
  console.log('Email:', email);
  console.log('Password:', password);
  res.redirect('/login');
});

//============login===============//
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred while processing your request.' });
    } else {
      if (results.length > 0) {
        const user = results[0];
        if (user.role === 'student') {
          res.sendFile(path.join(__dirname, 'views', 'student_booking.html'));
        } else if (user.role === 'staff') {
          res.sendFile(path.join(__dirname, 'views', 'staff_dashboard.html'));
        } else if (user.role === 'lecture') {
          res.sendFile(path.join(__dirname, 'views', 'lecture_dashboard.html'));
        } else {
          res.status(401).send('Unauthorized access');
        }
      } else {
        res.status(401).send('Invalid email or password');
      }
    }
  });
});


//============booking===============//
app.post('/api/bookings', (req, res) => {
  const { roomname, room_status, time_slot, reason } = req.body;
  const bookingData = { roomname, room_status, time_slot, reason };

  connection.query('INSERT INTO bookings SET ?', bookingData, (err, result) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'An error occurred while processing your booking.' });
    } else {
      console.log('Booking added successfully');
      res.status(201).json({ message: 'Booking successful' });
    }
  });
});


// API endpoint for getting bookings
app.get('/api/bookings', (req, res) => {
  connection.query('SELECT * FROM bookings', (err, results) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred while fetching bookings.' });
    } else {
      res.status(200).json(results);
    }
  });
});

//============booking===============//
// สร้าง API endpoint สำหรับการจองห้องสมุด
app.post('/api/bookings', (req, res) => {
  const { roomname, room_status, time_slot, reason } = req.body;
  const bookingData = { roomname, room_status, time_slot, reason };

  connection.query('INSERT INTO bookings SET ?', bookingData, (err, result) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'An error occurred while processing your booking.' });
    } else {
      console.log('Booking added successfully');
      res.status(201).json({ message: 'Booking successful' });
    }
  });
});

// API endpoint for updating booking status
app.put('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const { status, approver } = req.body;

  connection.query('UPDATE bookings SET status = ?, approver = ? WHERE id = ?', [status, approver, id], (err, result) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'An error occurred while updating booking status.' });
    } else {
      console.log('Booking status updated successfully');
      res.redirect('/student_status.html');
    }
  });
});



// API endpoint for updating booking status by lecture
app.put('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const { status, approver } = req.body;

  connection.query('UPDATE bookings SET status = ?, approver = ? WHERE id = ?', [status, approver, id], (err, result) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred while updating booking status.' });
    } else {
      console.log('Booking status updated successfully');
      res.status(200).json({ message: 'Booking status updated successfully' });

      // Insert into booking history table
      connection.query('INSERT INTO booking_history (booking_id, approver, status) VALUES (?, ?, ?)', [id, approver, status], (err, result) => {
        if (err) {
          console.error('Error:', err);
        } else {
          console.log('Booking history recorded successfully');
        }
      });
    }
  });
});

// API endpoint for booking history
app.get('/api/booking-history', (req, res) => {
  connection.query('SELECT * FROM booking_history', (err, results) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred while fetching booking history.' });
    } else {
      res.status(200).json(results);
    }
  });
});

// API endpoint for student booking status
app.get('/api/student-booking-status/:studentId', (req, res) => {
  const studentId = req.params.studentId;

  connection.query('SELECT b.*, bh.approver, bh.status FROM bookings b JOIN booking_history bh ON b.id = bh.booking_id WHERE b.student_id = ?', studentId, (err, results) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred while fetching booking status.' });
    } else {
      res.status(200).json(results);
    }
  });
});






// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


const port = 3004;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;
