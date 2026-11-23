package aras

import "regexp"

var passwordXML = regexp.MustCompile(`(?is)(<(?:[a-z0-9_]+:)?password\b[^>]*>).*?(</(?:[a-z0-9_]+:)?password\s*>)`)
var passwordEscapedXML = regexp.MustCompile(`(?is)(&lt;(?:[a-z0-9_]+:)?password(?:\s[^&]*)?&gt;).*?(&lt;/(?:[a-z0-9_]+:)?password\s*&gt;)`)

func redactSOAP(body string) string {
	body = passwordXML.ReplaceAllString(body, "${1}[REDACTED]${2}")
	return passwordEscapedXML.ReplaceAllString(body, "${1}[REDACTED]${2}")
}
