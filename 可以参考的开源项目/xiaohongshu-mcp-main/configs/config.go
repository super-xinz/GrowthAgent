package configs

import "os"

var (
	headless = true
	binPath  string
	Username string
)

func InitHeadless(value bool) { headless = value }
func IsHeadless() bool        { return headless }
func SetBinPath(value string) { binPath = value }
func GetBinPath() string      { return binPath }

func GetImagesPath() string {
	if path := os.Getenv("IMAGES_PATH"); path != "" {
		return path
	}
	return "/app/images"
}
