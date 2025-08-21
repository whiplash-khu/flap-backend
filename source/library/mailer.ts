// @ts-expect-error :: No type definition
import { SMTPChannel } from 'smtp-channel';

const smtp: SMTPChannel = new SMTPChannel({
	host: process['env']['EMAIL_HOST'],
	port: Number.parseInt(process['env']['EMAIL_PORT'], 10),
	// SSL/TLS instead of STARTTLS
	secure: true
});

export function sendMail(email: string, title: string, content: string): Promise<boolean> {
	return smtp.connect()
		.then(function (): Promise<void> {
			return smtp.write('EHLO server\r\n');
		})
		// SSL/TLS instead of STARTTLS
		//.then(function (): Promise<void> {
		//	return smtp.write('STARTTLS\r\n');
		//})
		//.then(function (): Promise<void> {
		//	return smtp.negotiateTLS();
		//})
		.then(function (): Promise<void> {
			return smtp.write('AUTH LOGIN\r\n');
		})
		.then(function (): Promise<void> {
			return smtp.write(Buffer.from(process['env']['EMAIL_USER'], 'utf-8').toString('base64') + '\r\n' + Buffer.from(process['env']['EMAIL_PASSWORD'], 'utf-8').toString('base64') + '\r\nMAIL FROM:<' + process['env']['EMAIL_USER'] + '> SMTPUTF8\r\nRCPT TO:<' + email + '>\r\n');
		})
		.then(function (): Promise<void> {
			return smtp.write('DATA\r\n');
		})
		.then(function (): Promise<void> {
			return smtp.write('From: Flap <' + process['env']['EMAIL_USER'] + '>\r\nTo: <' + email + '>\r\nSubject: =?UTF-8?B?' + Buffer.from(title.replace(/\./m, '..'), 'utf-8').toString('base64') + '?=\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' + Buffer.from(content.replace(/[^\r]\n/g, '\r\n').replace(/^\./m, '..')).toString('base64') + '\r\n.\r\nQUIT\r\n');
		})
		.then(function (): Promise<void> {
			return smtp.close();
		});
}