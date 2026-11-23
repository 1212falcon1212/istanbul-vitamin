package aras

import (
	"encoding/xml"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
)

var encodedXMLName = regexp.MustCompile(`_x([0-9a-fA-F]{4})_`)

func normalizedField(s string) string {
	s = encodedXMLName.ReplaceAllStringFunc(s, func(v string) string { n, _ := strconv.ParseInt(v[2:6], 16, 32); return string(rune(n)) })
	s = strings.NewReplacer("İ", "I", "ı", "i", " ", "", "_", "", "-", "").Replace(s)
	return strings.ToUpper(s)
}

// Decode SOAP namespaces, CDATA and escaped XML result strings before reading columns.
// Keep the first value: a shipment can have multiple rows/pieces.
func responseFields(body string) (map[string]string, error) {
	fields := map[string]string{}
	var parse func(string, int) error
	parse = func(input string, depth int) error {
		if depth > 3 {
			return fmt.Errorf("aras XML iç içe sonuç sınırı aşıldı")
		}
		dec := xml.NewDecoder(strings.NewReader(input))
		type frame struct {
			name string
			text strings.Builder
		}
		var stack []*frame
		for {
			tok, err := dec.Token()
			if err == io.EOF {
				break
			}
			if err != nil {
				return fmt.Errorf("aras XML yanıtı okunamadı: %w", err)
			}
			switch v := tok.(type) {
			case xml.StartElement:
				stack = append(stack, &frame{name: normalizedField(v.Name.Local)})
			case xml.CharData:
				if len(stack) > 0 {
					stack[len(stack)-1].text.Write(v)
				}
			case xml.EndElement:
				f := stack[len(stack)-1]
				stack = stack[:len(stack)-1]
				value := strings.TrimSpace(f.text.String())
				if value == "" {
					continue
				}
				if strings.HasSuffix(f.name, "RESULT") && strings.HasPrefix(value, "<") {
					if err := parse(value, depth+1); err != nil {
						return err
					}
				} else if fields[f.name] == "" {
					fields[f.name] = value
				}
			}
		}
		return nil
	}
	if err := parse(body, 0); err != nil {
		return nil, err
	}
	if msg := field(fields, "faultstring", "Error", "ErrorMessage", "HATA"); msg != "" {
		return nil, fmt.Errorf("aras servis hatası: %s", msg)
	}
	if code := field(fields, "ResultCode"); code != "" && code != "0" && code != "1" {
		return nil, fmt.Errorf("aras servis hatası: code=%s msg=%s", code, field(fields, "ResultMessage", "Message"))
	}
	return fields, nil
}

func field(fields map[string]string, names ...string) string {
	for _, name := range names {
		if value := fields[normalizedField(name)]; value != "" {
			return value
		}
	}
	return ""
}
