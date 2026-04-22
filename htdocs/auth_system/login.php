<?php
require 'config.php';
session_start(); 

$errorMessage = ""; 

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);
    $ip_address = $_SERVER['REMOTE_ADDR'];

    if (empty($username) || empty($password)) {
        $errorMessage = "Username and password are required.";
    } else {
        $stmt = $pdo->prepare("SELECT password FROM users WHERE username = :username");
        $stmt->bindParam(':username', $username);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result && password_verify($password, $result['password'])) {
            $stmt = $pdo->prepare("INSERT INTO login_attempts (username, ip_address, success) VALUES (:username, :ip_address, 1)");
            $stmt->bindParam(':username', $username);
            $stmt->bindParam(':ip_address', $ip_address);
            $stmt->execute();

            $_SESSION['username'] = $username; 
            header("Location: view_login_attempts.php");
            exit(); 
        } else {
            $stmt = $pdo->prepare("INSERT INTO login_attempts (username, ip_address, success) VALUES (:username, :ip_address, 0)");
            $stmt->bindParam(':username', $username);
            $stmt->bindParam(':ip_address', $ip_address);
            $stmt->execute();

            $errorMessage = "Invalid username or password."; 
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <style>
        body {
            background-image: url('https://static.vecteezy.com/system/resources/previews/006/115/516/non_2x/abstract-futuristic-circuit-board-illustration-high-computer-technology-dark-blue-color-background-hi-tech-digital-technology-concept-free-vector.jpg');
            background-size: cover; 
            background-position: center; 
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh; 
            margin: 0;
            font-family: Arial, sans-serif;
            color: white; 
        }
        .form-container {
            background-color: rgba(0, 0, 0, 0.7); 
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            width: 300px; 
            text-align: center; 
        }
        input[type="text"], input[type="password"] {
            width: 92%;
            padding: 10px;
            margin: 10px 0;
            border: none;
            border-radius: 5px;
        }
        input[type="submit"] {
            background-color: #4CAF50; 
            color: white; 
            border: none;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
        }
        input[type="submit"]:hover {
            background-color: #45a049; 
        }
        .error-message {
            color: red; 
            margin-top: 10px; 
            font-size: 14px; 
        }
        .signup-button {
            margin-top: 10px; 
            padding: 10px;
            background-color: #007BFF; 
            color: white; 
            border: none;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
        }
        .signup-button:hover {
            background-color: #0056b3; 
        }
    </style>
</head>
<body>

<div class="form-container">
    <form method="POST">
        <h2>Login</h2>
        Username: <input type="text" name="username" required>
        Password: <input type="password" name="password" required>
        <input type="submit" value="Login">
        <?php if ($errorMessage): ?>
            <div class="error-message"><?php echo htmlspecialchars($errorMessage); ?></div>
        <?php endif; ?>
    </form>
    <form action="register.php" method="GET" style="display: inline;">
        <button type="submit" class="signup-button">Sign Up</button>
    </form>
</div>

</body>
</html>