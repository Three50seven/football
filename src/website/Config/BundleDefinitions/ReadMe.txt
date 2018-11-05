---------------------------------------------
**** Script / Style Bundle Configuration ****
---------------------------------------------

1. All bundle definitions should live in Config/BundleDefinitions/.

2. New bundle.json files need to be registered in BundleConfig.cs and in the gulpfile.js

3. A bundle must have the following fields:
	name	- The name of the bundle. Supply this value when referencing a bundle in the markup using NetTango.Web.Optimizations
	files	- String array with each item being a path to a file or a bundle name.
			- Each path is relative to the webroot and should not be preceeded with a /.
			-	Ex. Scripts/myscript.js
			- Each "file" listed here will first be checked against available bundle names to determine if a nested bundle reference.
	The following fields are optional:
	filename	- Designated filename for the bundle. If not supplied, the name + "min.js" is used.
	subpath		- Subdirectory path under the output directory (defined in gulpfile.js) in which to place the bundle file.
				-	Ex. subpath: "common" -> /content/js/common/

4. NOTE: Because bundles can reference other bundles, 
	- please be aware of the referenced scripts in all your bundle references
	- take note of what bundles are being loaded on the page
	- a bundle will be a completely compiled file of all the referenced files/sub-bundles
	- if a script is used in more than one bundle and both of those bundles are referenced, that script will load twice! we want to avoid this!

5. Be sure to include any newly generated bundles in the project. Visual Studio may not recognize new js files by default; simply show all files and include in project.