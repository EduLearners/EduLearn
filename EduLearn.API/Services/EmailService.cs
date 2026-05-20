// ============================================================
// EmailService.cs — SMTP Email Sender (Password Reset)
//
// Uses MailKit to send emails via Gmail SMTP.
// Reads configuration from appsettings.json Email section.
// Used by: AuthService.cs (ForgotPasswordAsync)
// ============================================================

using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace EduLearn.API.Services;

public class EmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetLink)
    {
        var smtpHost = _config["Email:SmtpHost"]!;
        var smtpPort = int.Parse(_config["Email:SmtpPort"]!);
        var smtpUser = _config["Email:SmtpUser"]!;
        var smtpPassword = _config["Email:SmtpPassword"]!;
        var fromName = _config["Email:FromName"]!;
        var fromAddress = _config["Email:FromAddress"]!;

        // Build the email message
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "EduLearn — Password Reset Request";

        // HTML email body
        message.Body = new TextPart("html")
        {
            Text = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto;'>
                    <div style='background: linear-gradient(135deg, #1a3c6e, #2c5aa0);
                                padding: 30px; text-align: center;'>
                        <h1 style='color: white; margin: 0;'>EduLearn</h1>
                        <p style='color: #cce0ff; margin: 5px 0 0;'>University Management System</p>
                    </div>
                    <div style='padding: 30px; background: #f9f9f9;'>
                        <h2 style='color: #1a3c6e;'>Password Reset Request</h2>
                        <p>Hello <strong>{toName}</strong>,</p>
                        <p>We received a request to reset your EduLearn account password.
                           Click the button below to reset it.</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{resetLink}'
                               style='background: #1a3c6e; color: white; padding: 14px 28px;
                                      text-decoration: none; border-radius: 6px;
                                      font-size: 16px; font-weight: bold;'>
                                Reset My Password
                            </a>
                        </div>
                        <p style='color: #666; font-size: 14px;'>
                            This link will expire in <strong>15 minutes</strong>.
                        </p>
                        <p style='color: #666; font-size: 14px;'>
                            If you did not request a password reset,
                            you can safely ignore this email.
                            Your password will not be changed.
                        </p>
                    </div>
                    <div style='background: #eee; padding: 15px; text-align: center;'>
                        <small style='color: #999;'>
                            EduLearn University Management System
                        </small>
                    </div>
                </div>"
        };

        // Send via Gmail SMTP
        using var client = new SmtpClient();
        await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(smtpUser, smtpPassword);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    public async Task SendWelcomeEmailAsync(
        string toEmail,
        string toName,
        string username,
        string role,
        string loginUrl,
        string? tempPassword = null)
    {
        var smtpHost = _config["Email:SmtpHost"]!;
        var smtpPort = int.Parse(_config["Email:SmtpPort"]!);
        var smtpUser = _config["Email:SmtpUser"]!;
        var smtpPassword = _config["Email:SmtpPassword"]!;
        var fromName = _config["Email:FromName"]!;
        var fromAddress = _config["Email:FromAddress"]!;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Welcome to EduLearn — Your Account Details";

        // Build optional password row
        var passwordRow = tempPassword != null
            ? $@"<tr>
                    <td style='padding:8px 0;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;'>
                        <b>🔑 Temporary Password</b>
                    </td>
                    <td style='padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a3c6e;font-weight:bold;'>
                        {tempPassword}
                    </td>
                 </tr>"
            : string.Empty;

        message.Body = new TextPart("html")
        {
            Text = $@"
            <div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;'>
                <div style='background:linear-gradient(135deg,#1a3c6e,#2c5aa0);
                            padding:30px;text-align:center;'>
                    <h1 style='color:white;margin:0;'>EduLearn</h1>
                    <p style='color:#cce0ff;margin:5px 0 0;'>University Management System</p>
                </div>
                <div style='padding:30px;background:#f9f9f9;'>
                    <h2 style='color:#1a3c6e;margin-bottom:8px;'>Welcome to EduLearn!</h2>
                    <p style='color:#444;font-size:14px;'>Hello <strong>{toName}</strong>,</p>
                    <p style='color:#444;font-size:14px;'>
                        Your EduLearn account has been created.
                        Here are your login details:
                    </p>
                    <div style='background:white;border:1px solid #e0e0e0;
                                border-radius:8px;padding:16px;margin:16px 0;'>
                        <table style='width:100%;border-collapse:collapse;'>
                            <tr>
                                <td style='padding:8px 0;border-bottom:1px solid #f0f0f0;
                                           color:#666;font-size:13px;'>
                                    🌐 <b>Login URL</b>
                                </td>
                                <td style='padding:8px 0;border-bottom:1px solid #f0f0f0;
                                           font-size:13px;'>
                                    <a href='{loginUrl}' style='color:#1a3c6e;'>{loginUrl}</a>
                                </td>
                            </tr>
                            <tr>
                                <td style='padding:8px 0;border-bottom:1px solid #f0f0f0;
                                           color:#666;font-size:13px;'>
                                    👤 <b>Username</b>
                                </td>
                                <td style='padding:8px 0;border-bottom:1px solid #f0f0f0;
                                           font-size:13px;color:#1a3c6e;font-weight:bold;'>
                                    {username}
                                </td>
                            </tr>
                            <tr>
                                <td style='padding:8px 0;border-bottom:1px solid #f0f0f0;
                                           color:#666;font-size:13px;'>
                                    🎭 <b>Role</b>
                                </td>
                                <td style='padding:8px 0;border-bottom:1px solid #f0f0f0;
                                           font-size:13px;color:#1a3c6e;font-weight:bold;'>
                                    {role}
                                </td>
                            </tr>
                            {passwordRow}
                        </table>
                    </div>
                    <div style='text-align:center;margin:24px 0;'>
                        <a href='{loginUrl}'
                           style='background:#1a3c6e;color:white;padding:14px 28px;
                                  text-decoration:none;border-radius:6px;
                                  font-size:15px;font-weight:bold;'>
                            Login to EduLearn →
                        </a>
                    </div>
                    <p style='color:#888;font-size:13px;'>
                        Please change your password immediately after first login
                        using <strong>Profile → Change Password</strong>.
                    </p>
                    <p style='color:#888;font-size:13px;'>
                        If you did not expect this email, please contact your
                        IT Administrator.
                    </p>
                </div>
                <div style='background:#eee;padding:15px;text-align:center;'>
                    <small style='color:#999;'>EduLearn University Management System</small>
                </div>
            </div>"
        };

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(smtpUser, smtpPassword);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
    }
}