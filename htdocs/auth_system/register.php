<?php
require 'config.php';

$successMessage = ""; 

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    
    if (empty($username) || empty($password)) {
        echo "Username and password are required.";
        exit;
    }

    
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    
    $stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (:username, :password)");
    $stmt->bindParam(':username', $username);
    $stmt->bindParam(':password', $hashedPassword);

    try {
        $stmt->execute();
        $successMessage = "User  registered successfully.";
    } catch (PDOException $e) {
        echo "Error: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register</title>
    <style>
        body {
            background-image: url('https://static.vecteezy.com/system/resources/previews/006/115/516/non_2x/abstract-futuristic-circuit-board-illustration-high-computer-technology-dark-blue-color-background-hi-tech-digital-technology-concept-free-vector.jpg'); /* Set your background image path */
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
            background-color: rgba(3, 3, 3, 0.7); 
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(2, 242, 251, 0.5);
            text-align: center; 
        }
        input[type="text"], input[type="password"] {
            width: 97%;
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
        .success-message {
            color: #4CAF50; 
            margin: 10px 0; 
        }
        .login-button {
            margin-top: 10px; 
            padding: 10px;
            background-color: #007BFF; 
            color: white; 
            border: none;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
        }
        .login-button:hover {
            background-color: #0056b3; 
        }
    </style>
</head>
<body>

<div class="form-container">
    <?php if ($successMessage): ?>
        <div class="success-message"><?php echo htmlspecialchars($successMessage); ?></div>
        <form action="login.php" method="GET" style="display: inline;">
            <button type="submit" class="login-button">Go to Login</button>
        </form>
    <?php else: ?>
        <form method="POST">
            <h2>Register</h2>
            Username: <input type="text" name="username" required>
            Password: <input type="password" name="password" required>
            <input type="submit" value="Register">
        </form>
    <?php endif; ?>
</div>

</body>
</html>